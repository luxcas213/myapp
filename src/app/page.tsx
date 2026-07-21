import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNote, signOutAction } from "@/app/actions";
import { NotesList } from "@/components/notes-list";
import { PushManager } from "@/components/push-manager";

export default async function Home() {
  const session = await auth();
  const userId = session!.user!.id!;

  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, pinned: true, createdAt: true },
  });

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-4 dark:border-white/10">
        <h1 className="text-lg font-semibold">Mi App</h1>
        <form action={signOutAction}>
          <button className="text-xs text-zinc-500 dark:text-zinc-400">
            Salir
          </button>
        </form>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Notas
          </h2>
          <form action={createNote} className="flex gap-2">
            <input
              name="title"
              placeholder="Nueva nota..."
              className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 text-sm font-medium text-background"
            >
              +
            </button>
          </form>
          <NotesList notes={notes} />
        </section>

        <PushManager />
      </main>
    </div>
  );
}
