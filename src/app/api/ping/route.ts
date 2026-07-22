import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { webpush } from "@/lib/push";

// Public, unauthenticated on purpose (see proxy.ts's matcher) — anyone with
// the URL can send the owner a push notification. Logged as TrackerEntry
// rows (kind "ping") which double as a simple rate-limit counter.
const MAX_MESSAGE_LENGTH = 500;
const MAX_FROM_LENGTH = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

async function handlePing(rawMessage: string | null, rawFrom: string | null) {
  const message = (rawMessage ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  const from = (rawFrom ?? "").trim().slice(0, MAX_FROM_LENGTH) || "Alguien";

  if (!message) {
    return NextResponse.json(
      { error: "Falta el mensaje (message)." },
      { status: 400 }
    );
  }

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recent = await prisma.trackerEntry.count({
    where: { kind: "ping", occurredAt: { gte: since } },
  });
  if (recent >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Demasiados pings, probá de nuevo en un rato." },
      { status: 429 }
    );
  }

  await prisma.trackerEntry.create({
    data: { kind: "ping", note: message, data: { from } },
  });

  const subs = await prisma.pushSubscription.findMany();
  const payload = JSON.stringify({
    title: `📩 ${from} te mandó un mensaje`,
    body: message,
    url: "/",
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({ ok: true, sent });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const message = typeof body.message === "string" ? body.message : null;
  const from = typeof body.from === "string" ? body.from : null;
  return handlePing(message, from);
}

export async function GET(req: NextRequest) {
  const message = req.nextUrl.searchParams.get("message");
  const from = req.nextUrl.searchParams.get("from");
  return handlePing(message, from);
}
