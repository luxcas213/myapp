"use client";

import { motion } from "motion/react";
import { Check, X } from "lucide-react";

export type PastTask = {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
};

export function HistoryView({ tasks }: { tasks: PastTask[] }) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay recordatorios puntuales vencidos.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((t, i) => (
        <motion.li
          key={t.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: Math.min(i, 10) * 0.03 }}
          className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-4 py-3 dark:border-white/10"
        >
          <div>
            <p className="text-sm">{t.title}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(t.dueDate).toLocaleDateString("es-AR")}
            </p>
          </div>
          {t.done ? (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
            >
              <Check className="size-4 text-green-500" />
            </motion.span>
          ) : (
            <X className="size-4 text-red-500" />
          )}
        </motion.li>
      ))}
    </ul>
  );
}
