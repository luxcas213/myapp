"use client";

import { motion, type Variants } from "motion/react";

const containerVariants: Variants = {
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

/** Wrap sibling sections with this + `StaggerItem` for a staggered entrance.
 * Uses `display: contents` so it doesn't affect the parent's flex/grid
 * layout — children still lay out as direct flex items of whatever
 * contains this wrapper. */
export function StaggerIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} transition={{ duration: 0.2, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
}
