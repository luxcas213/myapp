"use client";

import { subDays } from "date-fns";
import { motion } from "motion/react";
import { Line, LineChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { computeStreak, dateKey, isTaskDueOn, type Recurrence } from "@/lib/recurrence";

export type ProgressTask = {
  id: string;
  title: string;
  recurrence: Recurrence;
  trackingType: "SIMPLE" | "LOGGED";
  completions: { forDate: string; value: number | null }[];
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

const chartConfig = {
  value: { label: "Valor", color: "var(--chart-1)" },
} satisfies ChartConfig;

function ValueChart({ completions }: { completions: ProgressTask["completions"] }) {
  const data = completions
    .filter((c) => c.value != null)
    .sort((a, b) => a.forDate.localeCompare(b.forDate))
    .slice(-30)
    .map((c) => ({ date: c.forDate.slice(5), value: c.value }));

  if (data.length === 0) return null;

  return (
    <ChartContainer config={chartConfig} className="h-32 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
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
      {task.trackingType === "LOGGED" && <ValueChart completions={task.completions} />}
    </motion.div>
  );
}

export function ProgressView({ tasks }: { tasks: ProgressTask[] }) {
  if (tasks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Todavía no hay tareas recurrentes para mostrar progreso.
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
