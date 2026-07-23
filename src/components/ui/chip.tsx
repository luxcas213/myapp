"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { TAP_SCALE, TAP_SPRING } from "@/lib/motion";

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
    <motion.button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      whileTap={{ scale: TAP_SCALE }}
      transition={TAP_SPRING}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm font-medium [-webkit-tap-highlight-color:transparent] transition-colors",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-black/10 bg-white text-foreground dark:border-white/10 dark:bg-zinc-900",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
