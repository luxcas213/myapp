"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { TAP_SCALE, TAP_SPRING } from "@/lib/motion";

export function BackLink({ href }: { href: string }) {
  return (
    <motion.div whileTap={{ scale: TAP_SCALE }} transition={TAP_SPRING} className="inline-flex">
      <Link href={href} aria-label="Volver">
        <ChevronLeft className="size-5" />
      </Link>
    </motion.div>
  );
}
