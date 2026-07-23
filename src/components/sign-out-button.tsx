"use client";

import { motion } from "motion/react";
import { signOutAction } from "@/app/actions";
import { TAP_SCALE, TAP_SPRING } from "@/lib/motion";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <motion.button
        whileTap={{ scale: TAP_SCALE }}
        transition={TAP_SPRING}
        className="text-xs text-zinc-500 [-webkit-tap-highlight-color:transparent] dark:text-zinc-400"
      >
        Salir
      </motion.button>
    </form>
  );
}
