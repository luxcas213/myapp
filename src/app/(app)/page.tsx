import Link from "next/link";
import { isSameDay } from "date-fns";
import { ListTodo, NotebookPen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { PushManager } from "@/components/push-manager";
import { getActiveTasks } from "@/lib/tasks";
import { dateKey, isTaskDueOn, type Recurrence } from "@/lib/recurrence";
import { TaskList, type ListedTask } from "./recordatorios/task-list";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = new Date();
  const todayKey = dateKey(today);
  const tasks = await getActiveTasks();

  const hoy: ListedTask[] = [];
  for (const task of tasks) {
    const recurrence = task.recurrence as Recurrence | null;
    const dueToday = recurrence
      ? isTaskDueOn(recurrence, today)
      : task.dueDate
        ? isSameDay(task.dueDate, today)
        : false;
    if (!dueToday) continue;

    hoy.push({
      id: task.id,
      title: task.title,
      trackingType: task.trackingType,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      recurrence,
      tags: task.tags,
      doneToday: task.completions.some((c) => dateKey(c.forDate) === todayKey),
      completedDateKeys: task.completions.map((c) => dateKey(c.forDate)),
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-4 dark:border-white/10">
        <h1 className="text-lg font-semibold">Mi App</h1>
        <SignOutButton />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/recordatorios/nueva"
            className={buttonVariants({ variant: "outline", className: "h-auto flex-col gap-2 py-4" })}
          >
            <ListTodo className="size-5" />
            Nuevo recordatorio
          </Link>
          <Link
            href="/notas"
            className={buttonVariants({ variant: "outline", className: "h-auto flex-col gap-2 py-4" })}
          >
            <NotebookPen className="size-5" />
            Nueva nota
          </Link>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Hoy</h2>
          {hoy.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tenés recordatorios para hoy.
            </p>
          ) : (
            <TaskList hoy={hoy} proximas={[]} sinFecha={[]} />
          )}
        </section>

        <PushManager />
      </main>
    </div>
  );
}
