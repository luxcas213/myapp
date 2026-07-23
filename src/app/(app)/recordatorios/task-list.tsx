"use client";

import Link from "next/link";
import { useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Flame, ListChecks, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteTask } from "./actions";
import { computeStreak, type Recurrence } from "@/lib/recurrence";

export type ListedTask = {
  id: string;
  title: string;
  trackingType: "SIMPLE" | "COMPOUND";
  confirmMode: "SLIDER" | "FORM" | null;
  dueDate: string | null;
  recurrence: Recurrence | null;
  tags: { name: string }[];
  doneToday: boolean;
  completedDateKeys: string[];
};

function TaskIndicator({ task }: { task: ListedTask }) {
  if (task.trackingType !== "COMPOUND") {
    return (
      <div className="flex size-6 shrink-0 items-center justify-center text-zinc-300 dark:text-zinc-700">
        <ListChecks className="size-4" />
      </div>
    );
  }

  const circle = (
    <div
      aria-hidden
      className={
        "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors " +
        (task.doneToday
          ? "border-foreground bg-foreground text-background"
          : "border-black/20 dark:border-white/20")
      }
    >
      <AnimatePresence>
        {task.doneToday && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <Check className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );

  if (task.doneToday) return circle;

  // Not done yet — tapping the indicator (or the title, see below) opens the
  // same confirm screen the push notification deep-links to (slider or
  // form), instead of a quick in-list toggle.
  return (
    <Link
      href={`/recordatorios/completar/${task.id}`}
      aria-label="Confirmar recordatorio"
      className="shrink-0"
    >
      {circle}
    </Link>
  );
}

function TaskRow({ task }: { task: ListedTask }) {
  const [isPending, startTransition] = useTransition();
  const streak = task.recurrence
    ? computeStreak(task.recurrence, new Set(task.completedDateKeys))
    : null;
  const isCompound = task.trackingType === "COMPOUND";
  const clickable = isCompound && !task.doneToday;

  function remove() {
    startTransition(async () => {
      await deleteTask(task.id);
      toast("Recordatorio eliminado", { description: task.title });
    });
  }

  const titleBlock = (
    <div className="min-w-0 flex-1">
      <p
        className={
          task.doneToday ? "truncate text-sm line-through opacity-50" : "truncate text-sm"
        }
      >
        {task.title}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {streak && streak.current > 0 && (
          <span className="inline-flex items-center gap-0.5 text-xs text-orange-500">
            <Flame className="size-3" />
            {streak.current}
          </span>
        )}
        {task.tags.map((t) => (
          <Badge key={t.name} variant="outline" className="text-[10px]">
            {t.name}
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 rounded-lg border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900"
    >
      <TaskIndicator task={task} />

      {clickable ? (
        <Link href={`/recordatorios/completar/${task.id}`} className="min-w-0 flex-1">
          {titleBlock}
        </Link>
      ) : (
        titleBlock
      )}

      <Link
        href={`/recordatorios/${task.id}/editar`}
        aria-label="Editar"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <Pencil className="size-4 text-zinc-400" />
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Eliminar"
        disabled={isPending}
        onClick={remove}
      >
        <Trash2 className="size-4 text-zinc-400 hover:text-destructive" />
      </Button>
    </motion.li>
  );
}

function TaskGroup({ title, tasks }: { title: string; tasks: ListedTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export function TaskList({
  hoy,
  proximas,
  sinFecha,
}: {
  hoy: ListedTask[];
  proximas: ListedTask[];
  sinFecha: ListedTask[];
}) {
  if (hoy.length === 0 && proximas.length === 0 && sinFecha.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay recordatorios activos todavía.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TaskGroup title="Hoy" tasks={hoy} />
      <TaskGroup title="Próximas" tasks={proximas} />
      <TaskGroup title="Sin fecha" tasks={sinFecha} />
    </div>
  );
}
