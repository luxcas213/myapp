import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { webpush } from "@/lib/push";
import { dateKey, isTaskDueOn, type Recurrence } from "@/lib/recurrence";

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

    if (n.timeOfDay != null) {
      if (!n.task.recurrence) return false;
      if (!isTaskDueOn(n.task.recurrence as Recurrence, now)) return false;
      const diff = nowMinutes - n.timeOfDay;
      return diff >= 0 && diff < SWEEP_WINDOW_MINUTES;
    }

    if (n.sendAt) {
      const diffMs = now.getTime() - n.sendAt.getTime();
      return diffMs >= 0 && diffMs < SWEEP_WINDOW_MINUTES * 60_000;
    }

    return false;
  });

  if (due.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const subs = await prisma.pushSubscription.findMany();
  let sent = 0;
  const expiredSubIds = new Set<string>();

  for (const notification of due) {
    const url = notification.requireConfirmation
      ? `/recordatorios/confirmar/${notification.id}`
      : "/recordatorios";
    const payload = JSON.stringify({
      title: notification.task.title,
      body: notification.task.description ?? "Tenés un recordatorio pendiente.",
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
