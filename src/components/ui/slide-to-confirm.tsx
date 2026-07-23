"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const THUMB_SIZE = 46;
const TRACK_PADDING = 8;

export function SlideToConfirm({
  label = "Deslizá para confirmar",
  confirmedLabel = "¡Confirmado!",
  onConfirm,
  disabled,
}: {
  label?: string;
  confirmedLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const startXRef = useRef(0);
  const startDragXRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(([entry]) => {
      setTrackWidth(entry.contentRect.width);
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING);

  function confirm() {
    setConfirmed(true);
    setDragging(false);
    setDragX(max);
    onConfirm();
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (confirmed || disabled) return;
    setDragging(true);
    startXRef.current = e.clientX;
    startDragXRef.current = dragX;
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || confirmed) return;
    const delta = e.clientX - startXRef.current;
    const next = Math.min(Math.max(0, startDragXRef.current + delta), max);
    setDragX(next);
    if (max > 0 && next >= max - 2) confirm();
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (!confirmed) setDragX(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (confirmed || disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      confirm();
    }
  }

  const progress = max > 0 ? dragX / max : 0;

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={label}
      aria-valuenow={confirmed ? 100 : Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex h-[54px] w-full max-w-xs items-center rounded-full border p-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        confirmed
          ? "border-green-500 bg-green-500"
          : "border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium",
          confirmed ? "text-white" : "text-muted-foreground"
        )}
        style={{ opacity: confirmed ? 1 : 1 - progress }}
      >
        {confirmed ? confirmedLabel : label}
      </span>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          transform: `translateX(${dragX}px)`,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        className={cn(
          "relative z-10 flex shrink-0 items-center justify-center rounded-full",
          dragging ? "cursor-grabbing" : "cursor-grab",
          confirmed ? "bg-white text-green-500" : "bg-foreground text-background"
        )}
      >
        {confirmed ? <Check className="size-5" /> : <ChevronRight className="size-5" />}
      </div>
    </div>
  );
}
