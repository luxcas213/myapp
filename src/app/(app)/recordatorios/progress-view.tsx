"use client";

import { subDays } from "date-fns";
import { motion } from "motion/react";
import { computeStreak, dateKey, isTaskDueOn, type Recurrence } from "@/lib/recurrence";
import type { FormFieldDef, FormValues } from "@/lib/form-schema";

export type ProgressTask = {
  id: string;
  title: string;
  recurrence: Recurrence;
  confirmMode: "SLIDER" | "FORM" | null;
  formSchema: FormFieldDef[] | null;
  completions: { forDate: string; data: FormValues | null }[];
};

const HEATMAP_DAYS = 30;

function Heatmap({
  recurrence,
  completedDateKeys,
}: {
  recurrence: Recurrence;
  completedDateKeys: ReadonlySet<string>;
}) {
  const today = new Date();
  const cells = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = subDays(today, i);
    cells.push({
      key: dateKey(d),
      day: d.getDate(),
      due: isTaskDueOn(recurrence, d),
      isFuture: d > today,
    });
  }

  return (
    <div className="grid grid-cols-10 gap-1">
      {cells.map(({ key, day, due, isFuture }, i) => {
        const done = completedDateKeys.has(key);
        const colorClass = !due
          ? "bg-zinc-50 text-zinc-300 dark:bg-zinc-900 dark:text-zinc-700"
          : done
            ? "bg-green-500 text-white"
            : isFuture
              ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
              : "bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-400";
        return (
          <motion.div
            key={key}
            title={key}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, delay: i * 0.008 }}
            className={`flex aspect-square items-center justify-center rounded-sm text-[9px] ${colorClass}`}
          >
            {day}
          </motion.div>
        );
      })}
    </div>
  );
}

/** One-line human summary of a FORM completion's data, for the recent-entries list. */
function summarizeCompletion(schema: FormFieldDef[], data: FormValues | null): string {
  if (!data) return "Confirmado";
  const parts: string[] = [];
  for (const field of schema) {
    const value = data[field.id];
    if (value == null) continue;
    if (field.type === "GROUP") {
      const count = Array.isArray(value) ? value.length : 0;
      if (count > 0) parts.push(`${field.name} ×${count}`);
    } else {
      parts.push(`${field.name}: ${value}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "Confirmado";
}

function RecentEntries({
  schema,
  completions,
}: {
  schema: FormFieldDef[];
  completions: ProgressTask["completions"];
}) {
  const recent = [...completions]
    .sort((a, b) => b.forDate.localeCompare(a.forDate))
    .slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5 border-t border-black/10 pt-3 dark:border-white/10">
      {recent.map((c) => (
        <li key={c.forDate} className="flex items-baseline justify-between gap-3 text-xs">
          <span className="shrink-0 text-muted-foreground">{c.forDate}</span>
          <span className="truncate text-right">{summarizeCompletion(schema, c.data)}</span>
        </li>
      ))}
    </ul>
  );
}

function ProgressCard({ task, index }: { task: ProgressTask; index: number }) {
  const completedDateKeys = new Set(task.completions.map((c) => c.forDate));
  const streak = computeStreak(task.recurrence, completedDateKeys);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{task.title}</h3>
        <div className="text-xs text-muted-foreground">
          Racha: <span className="font-semibold text-foreground">{streak.current}</span>
          {" · "}Mejor: {streak.longest}
        </div>
      </div>
      <Heatmap recurrence={task.recurrence} completedDateKeys={completedDateKeys} />
      {task.confirmMode === "FORM" && (
        <RecentEntries schema={task.formSchema ?? []} completions={task.completions} />
      )}
    </motion.div>
  );
}

export function ProgressView({ tasks }: { tasks: ProgressTask[] }) {
  if (tasks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay recordatorios compuestos recurrentes para mostrar progreso.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tasks.map((t, i) => (
        <ProgressCard key={t.id} task={t} index={i} />
      ))}
    </div>
  );
}
