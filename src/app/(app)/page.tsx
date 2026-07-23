import { isSameDay } from "date-fns";
import { SignOutButton } from "@/components/sign-out-button";
import { PushManager } from "@/components/push-manager";
import { StaggerIn, StaggerItem } from "@/components/stagger-in";
import { getActiveTasks } from "@/lib/tasks";
import { dateKey, isTaskDueOn, type Recurrence } from "@/lib/recurrence";
import { appNow } from "@/lib/timezone";
import { TaskList, type ListedTask } from "./recordatorios/task-list";
import { QuickActions } from "./quick-actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = appNow();
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
      confirmMode: task.confirmMode,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      recurrence,
      tags: task.tags,
      doneToday: task.completions.some((c) => dateKey(c.forDate) === todayKey),
      completedDateKeys: task.completions.map((c) => dateKey(c.forDate)),
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-4 dark:border-white/10">
        <h1 className="text-lg font-semibold">Mi App</h1>
        <SignOutButton />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <StaggerIn className="contents">
          <StaggerItem>
            <QuickActions />
          </StaggerItem>

          <StaggerItem>
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
          </StaggerItem>
        </StaggerIn>

        <PushManager />
      </main>
    </div>
  );
}
