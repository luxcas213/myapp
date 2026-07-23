import Link from "next/link";
import { isSameDay } from "date-fns";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignOutButton } from "@/components/sign-out-button";
import { getActiveTasks } from "@/lib/tasks";
import { dateKey, isTaskDueOn, type Recurrence } from "@/lib/recurrence";
import { prisma } from "@/lib/prisma";
import type { FormFieldDef, FormValues } from "@/lib/form-schema";
import { appNow } from "@/lib/timezone";
import { TaskList, type ListedTask } from "./task-list";
import { ProgressView, type ProgressTask } from "./progress-view";
import { HistoryView, type PastTask } from "./history-view";

export const dynamic = "force-dynamic";

export default async function RecordatoriosPage() {
  const today = appNow();
  const todayKey = dateKey(today);

  const [activeTasks, pastDueTasks] = await Promise.all([
    getActiveTasks(),
    prisma.task.findMany({
      where: { dueDate: { lt: today } },
      include: { completions: true },
      orderBy: { dueDate: "desc" },
      take: 50,
    }),
  ]);
  // One-off tasks only — recurring tasks never have dueDate set, so this
  // filter is just belt-and-suspenders against the query above.
  const pastOneOffTasks = pastDueTasks.filter((t) => t.recurrence == null);

  const hoy: ListedTask[] = [];
  const proximas: ListedTask[] = [];
  const sinFecha: ListedTask[] = [];

  for (const task of activeTasks) {
    const recurrence = task.recurrence as Recurrence | null;
    const completedDateKeys = task.completions.map((c) => dateKey(c.forDate));
    const doneToday = completedDateKeys.includes(todayKey);

    const listed: ListedTask = {
      id: task.id,
      title: task.title,
      trackingType: task.trackingType,
      confirmMode: task.confirmMode,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      recurrence,
      tags: task.tags,
      doneToday,
      completedDateKeys,
    };

    if (recurrence) {
      if (isTaskDueOn(recurrence, today)) hoy.push(listed);
      else proximas.push(listed);
    } else if (task.dueDate) {
      if (isSameDay(task.dueDate, today)) hoy.push(listed);
      else if (task.dueDate > today) proximas.push(listed);
      // past-due one-offs fall through to the Historial tab instead
    } else {
      sinFecha.push(listed);
    }
  }

  const progressTasks: ProgressTask[] = activeTasks
    .filter((t) => t.recurrence != null && t.trackingType === "COMPOUND")
    .map((t) => ({
      id: t.id,
      title: t.title,
      recurrence: t.recurrence as Recurrence,
      confirmMode: t.confirmMode,
      formSchema: t.formSchema as FormFieldDef[] | null,
      completions: t.completions.map((c) => ({
        forDate: dateKey(c.forDate),
        data: c.data as FormValues | null,
      })),
    }));

  const pastTasks: PastTask[] = pastOneOffTasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate!.toISOString(),
    done: t.completions.length > 0,
  }));

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-4 dark:border-white/10">
        <h1 className="text-lg font-semibold">Recordatorios</h1>
        <SignOutButton />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
        <Link href="/recordatorios/nueva" className={buttonVariants()}>
          <Plus className="size-4" /> Nuevo recordatorio
        </Link>

        <Tabs defaultValue="activos">
          <TabsList>
            <TabsTrigger value="activos">Activos</TabsTrigger>
            <TabsTrigger value="progreso">Progreso</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
          <TabsContent value="activos">
            <TaskList hoy={hoy} proximas={proximas} sinFecha={sinFecha} />
          </TabsContent>
          <TabsContent value="progreso">
            <ProgressView tasks={progressTasks} />
          </TabsContent>
          <TabsContent value="historial">
            <HistoryView tasks={pastTasks} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
