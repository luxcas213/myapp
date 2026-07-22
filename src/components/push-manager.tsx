"use client";

import { useEffect, useRef } from "react";

const ASKED_KEY = "push-permission-asked";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribe(registration: ServiceWorkerRegistration) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
}

/**
 * Invisible by design: this app has exactly one user who wants push
 * notifications for reminders, so the usual "don't ask for permission on
 * load" advice (aimed at anonymous-visitor opt-in rates) doesn't apply here.
 * It asks once, the very first time the app is opened, then never shows
 * any UI again regardless of the answer.
 */
export function PushManager() {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    (async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      if (existing) return;

      if (Notification.permission === "granted") {
        await subscribe(registration);
        return;
      }

      if (Notification.permission === "denied") return;

      if (localStorage.getItem(ASKED_KEY)) return;
      localStorage.setItem(ASKED_KEY, "1");

      const permission = await Notification.requestPermission();
      if (permission === "granted") await subscribe(registration);
    })();
  }, []);

  return null;
}
