import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAllTags } from "@/lib/tasks";
import type { Recurrence } from "@/lib/recurrence";
import { TaskForm } from "../../task-form";

export const dynamic = "force-dynamic";

export default async function EditarTareaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, tags] = await Promise.all([
    prisma.task.findUnique({
      where: { id },
      include: { tags: true, notifications: true },
    }),
    getAllTags(),
  ]);

  if (!task) notFound();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center gap-3 border-b border-black/10 px-4 py-4 dark:border-white/10">
        <Link href="/recordatorios" aria-label="Volver">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Editar recordatorio</h1>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1">
        <TaskForm
          task={{
            id: task.id,
            title: task.title,
            description: task.description,
            trackingType: task.trackingType,
            dueDate: task.dueDate,
            recurrence: task.recurrence as Recurrence | null,
            tags: task.tags,
            notifications: task.notifications,
          }}
          existingTags={tags.map((t) => t.name)}
        />
      </main>
    </div>
  );
}
