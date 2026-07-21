import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { webpush } from "@/lib/push";

// Sends a test push notification to every device subscribed (single-user app).
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await prisma.pushSubscription.findMany();

  const payload = JSON.stringify({
    title: "Mi App",
    body: "Notificación de prueba",
    url: "/",
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    )
  );

  const expired = results
    .map((r, i) => ({ r, sub: subs[i] }))
    .filter(({ r }) => r.status === "rejected")
    .map(({ sub }) => sub.id);

  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expired } },
    });
  }

  return NextResponse.json({ sent: subs.length - expired.length });
}
