import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { webpush } from "@/lib/push";
import { dateKey, isOccurrenceDueOn, type Recurrence } from "@/lib/recurrence";
import { appNow } from "@/lib/timezone";

// How often the external scheduler (GitHub Actions) hits this route (every
// 5 minutes, see .github/workflows/reminders-cron.yml). A notification
// fires once its configured time falls inside the window ending "now" —
// kept wider than the sweep interval (2x) to tolerate GitHub Actions'
// documented schedule jitter/delay under load, without ballooning into
// the old 15-minute imprecision.
const SWEEP_WINDOW_MINUTES = 10;

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Not gated by the interactive session auth() check used elsewhere (the
// scheduler calling this has no browser session) — a shared secret instead.
function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Whether `notification` should fire today, independent of the time-of-day
 * check. Two shapes:
 * - `daysBefore == null` (DAILY/WEEKDAYS, no date to offset from): fires on
 *   any day the task's recurrence is due.
 * - `daysBefore != null` (Una vez/MONTHLY, has a date): fires today if the
 *   task's occurrence lands exactly `daysBefore` days from now — i.e.
 *   project forward and check the task is due on that projected date.
 */
function isNotificationDayDue(
  task: { recurrence: unknown; dueDate: Date | null },
  daysBefore: number | null,
  today: Date
): boolean {
  const recurrence = task.recurrence as Recurrence | null;
  if (daysBefore == null) {
    if (!recurrence) return false;
    return isOccurrenceDueOn({ recurrence, dueDate: null }, today);
  }
  const candidateOccurrence = addDays(today, daysBefore);
  return isOccurrenceDueOn({ recurrence, dueDate: task.dueDate }, candidateOccurrence);
}

// web-push can reject with a StatusCodeError-ish object carrying the push
// service's HTTP status. Only 404/410 mean "this subscription is gone for
// good" — anything else (network hiccup, 5xx from the push service) is
// transient and shouldn't cost the owner their one registered device.
function isGoneStatus(reason: unknown): boolean {
  const status = (reason as { statusCode?: number } | null)?.statusCode;
  return status === 404 || status === 410;
}

// `webpush.sendNotification` returns a Promise, but wrap the call itself so
// that if it (or anything upstream) throws synchronously, it still surfaces
// as a rejected promise instead of blowing up the whole `Promise.allSettled`
// call and crashing the request with an unhandled exception.
async function sendOne(sub: { endpoint: string; p256dh: string; auth: string }, payload: string) {
  return webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    payload
  );
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = appNow();
    const today = dateKey(now);
    const nowMinutes = minutesSinceMidnight(now);

    const notifications = await prisma.taskNotification.findMany({
      where: { task: { active: true } },
      include: { task: true },
    });

    const due = notifications.filter((n) => {
      if (n.lastFiredForDate && dateKey(n.lastFiredForDate) === today) return false;
      if (n.timeOfDay == null) return false;

      const diff = nowMinutes - n.timeOfDay;
      if (diff < 0 || diff >= SWEEP_WINDOW_MINUTES) return false;

      return isNotificationDayDue(n.task, n.daysBefore, now);
    });

    if (due.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const subs = await prisma.pushSubscription.findMany();
    let sent = 0;
    const goneSubIds = new Set<string>();

    for (const notification of due) {
      const task = notification.task;
      const opensConfirm = notification.requireConfirmation && task.trackingType === "COMPOUND";
      const url = opensConfirm ? `/recordatorios/confirmar/${notification.id}` : "/recordatorios";
      const payload = JSON.stringify({
        title: task.message?.trim() || task.title,
        body: task.description ?? "Tenés un recordatorio pendiente.",
        url,
        requireInteraction: notification.requireConfirmation,
      });

      const results = await Promise.allSettled(subs.map((sub) => sendOne(sub, payload)));

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error("Push send failed", subs[i].id, r.reason);
          if (isGoneStatus(r.reason)) goneSubIds.add(subs[i].id);
        } else {
          sent++;
        }
      });

      await prisma.taskNotification.update({
        where: { id: notification.id },
        data: { lastFiredForDate: now },
      });
    }

    if (goneSubIds.size > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: [...goneSubIds] } },
      });
    }

    return NextResponse.json({ sent, checked: notifications.length, fired: due.length });
  } catch (error) {
    console.error("Reminders sweep failed", error);
    return NextResponse.json(
      { error: "Sweep failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
