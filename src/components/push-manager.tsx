"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushManager() {
  const [status, setStatus] = useState<
    "idle" | "unsupported" | "subscribed" | "denied"
  >(() =>
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
      ? "idle"
      : "unsupported"
  );

  useEffect(() => {
    if (status === "unsupported") return;
    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      if (existing) setStatus("subscribed");
    });
  }, [status]);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("denied");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    setStatus("subscribed");
  }

  if (status === "unsupported") return null;

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      {status === "subscribed" ? (
        <span>🔔 Notificaciones activadas</span>
      ) : (
        <button onClick={enable} className="underline">
          Activar notificaciones
        </button>
      )}
    </div>
  );
}
