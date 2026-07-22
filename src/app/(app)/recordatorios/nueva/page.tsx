import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAllTags } from "@/lib/tasks";
import { TaskForm } from "../task-form";

export const dynamic = "force-dynamic";

export default async function NuevaTareaPage() {
  const tags = await getAllTags();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center gap-3 border-b border-black/10 px-4 py-4 dark:border-white/10">
        <Link href="/recordatorios" aria-label="Volver">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Nuevo recordatorio</h1>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1">
        <TaskForm existingTags={tags.map((t) => t.name)} />
      </main>
    </div>
  );
}
