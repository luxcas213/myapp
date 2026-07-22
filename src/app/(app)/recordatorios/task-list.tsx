"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check, Flame, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { completeTask, uncompleteTask, deleteTask } from "./actions";
import { computeStreak, dateKey, type Recurrence } from "@/lib/recurrence";

export type ListedTask = {
  id: string;
  title: string;
  trackingType: "SIMPLE" | "LOGGED";
  dueDate: string | null;
  recurrence: Recurrence | null;
  tags: { name: string }[];
  doneToday: boolean;
  completedDateKeys: string[];
};

function TaskRow({ task, todayKey }: { task: ListedTask; todayKey: string }) {
  const [isPending, startTransition] = useTransition();
  const streak = task.recurrence
    ? computeStreak(task.recurrence, new Set(task.completedDateKeys))
    : null;

  function toggle() {
    startTransition(async () => {
      if (task.doneToday) {
        await uncompleteTask(task.id, todayKey);
      } else {
        await completeTask(task.id, todayKey);
      }
    });
  }

  function remove() {
    startTransition(() => deleteTask(task.id));
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-black/10 px-4 py-3 dark:border-white/10">
      <button
        aria-label={task.doneToday ? "Marcar no hecho" : "Marcar hecho"}
        disabled={isPending}
        onClick={toggle}
        className={
          "flex size-6 shrink-0 items-center justify-center rounded-full border " +
          (task.doneToday
            ? "border-foreground bg-foreground text-background"
            : "border-black/20 dark:border-white/20")
        }
      >
        {task.doneToday && <Check className="size-4" />}
      </button>

      <div className="flex-1">
        <p className={task.doneToday ? "text-sm line-through opacity-50" : "text-sm"}>
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

      <Link href={`/recordatorios/${task.id}/editar`} aria-label="Editar">
        <Pencil className="size-4 text-zinc-400" />
      </Link>
      <button aria-label="Eliminar" disabled={isPending} onClick={remove}>
        <Trash2 className="size-4 text-zinc-400 hover:text-red-500" />
      </button>
    </li>
  );
}

function TaskGroup({
  title,
  tasks,
  todayKey,
}: {
  title: string;
  tasks: ListedTask[];
  todayKey: string;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} todayKey={todayKey} />
        ))}
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
  const todayKey = dateKey(new Date());

  if (hoy.length === 0 && proximas.length === 0 && sinFecha.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay recordatorios activos todavía.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TaskGroup title="Hoy" tasks={hoy} todayKey={todayKey} />
      <TaskGroup title="Próximas" tasks={proximas} todayKey={todayKey} />
      <TaskGroup title="Sin fecha" tasks={sinFecha} todayKey={todayKey} />
    </div>
  );
}
