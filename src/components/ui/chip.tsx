"use client";

import { cn } from "@/lib/utils";

export function Chip({
  pressed,
  onClick,
  children,
  className,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-black/10 bg-white text-foreground dark:border-white/10 dark:bg-zinc-900",
        className
      )}
    >
      {children}
    </button>
  );
}
