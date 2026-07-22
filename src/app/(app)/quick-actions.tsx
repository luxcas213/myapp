"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ListTodo, NotebookPen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const ACTIONS = [
  { href: "/recordatorios/nueva", label: "Nuevo recordatorio", icon: ListTodo },
  { href: "/notas", label: "Nueva nota", icon: NotebookPen },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <motion.div key={href} whileTap={{ scale: 0.96 }}>
          <Link
            href={href}
            className={buttonVariants({
              variant: "outline",
              className: "h-auto w-full flex-col gap-2 py-4",
            })}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
