import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createNote } from "@/app/actions";
import { NotesList } from "@/components/notes-list";
import { SignOutButton } from "@/components/sign-out-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Behind login and reads live data — never prerender/cache this page.
export const dynamic = "force-dynamic";

export default async function NotasPage() {
  const notes = await prisma.note.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, pinned: true, createdAt: true },
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-4 dark:border-white/10">
        <h1 className="text-lg font-semibold">Notas</h1>
        <SignOutButton />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <section className="flex flex-col gap-3">
          <form action={createNote} className="flex gap-2">
            <Input name="title" placeholder="Nueva nota..." required />
            <Button type="submit" size="icon" aria-label="Agregar nota">
              <Plus className="size-4" />
            </Button>
          </form>
          <NotesList notes={notes} />
        </section>
      </main>
    </div>
  );
}
