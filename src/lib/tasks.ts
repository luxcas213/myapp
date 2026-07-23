import { prisma } from "@/lib/prisma";
import { dateKey, isOccurrenceDueOn, type Recurrence } from "@/lib/recurrence";

export type TaskWithState = Awaited<ReturnType<typeof getActiveTasks>>[number];

export async function getActiveTasks() {
  return prisma.task.findMany({
    where: { active: true },
    include: {
      tags: true,
      notifications: true,
      completions: { orderBy: { forDate: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}

/** Recurring tasks use the recurrence rule; one-off tasks use dueDate. */
export function isDueOn(
  task: Pick<TaskWithState, "recurrence" | "dueDate">,
  date: Date
): boolean {
  return isOccurrenceDueOn(
    { recurrence: task.recurrence as Recurrence | null, dueDate: task.dueDate },
    date
  );
}

export function isDoneOn(
  task: Pick<TaskWithState, "completions">,
  date: Date
): boolean {
  const key = dateKey(date);
  return task.completions.some((c) => dateKey(c.forDate) === key);
}

export function isRecurring(task: Pick<TaskWithState, "recurrence">): boolean {
  return task.recurrence != null;
}
