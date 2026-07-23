import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { webpush } from "@/lib/push";
import { dateKey, isOccurrenceDueOn, type Recurrence } from "@/lib/recurrence";

// How often the external scheduler (GitHub Actions) hits this route.
// A notification fires once its configured time falls inside the window
// ending "now" — wide enough to tolerate scheduler jitter/delay.
const SWEEP_WINDOW_MINUTES = 15;

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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
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
  const expiredSubIds = new Set<string>();

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

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    results.forEach((r, i) => {
      if (r.status === "rejected") expiredSubIds.add(subs[i].id);
      else sent++;
    });

    await prisma.taskNotification.update({
      where: { id: notification.id },
      data: { lastFiredForDate: now },
    });
  }

  if (expiredSubIds.size > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: [...expiredSubIds] } },
    });
  }

  return NextResponse.json({ sent, checked: notifications.length, fired: due.length });
}
