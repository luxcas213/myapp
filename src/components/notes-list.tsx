"use client";

import { useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toggleNotePinned, deleteNote } from "@/app/actions";
import { Button } from "@/components/ui/button";

type Note = {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: Date;
};

export function NotesList({ notes }: { notes: Note[] }) {
  const [isPending, startTransition] = useTransition();

  if (notes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay notas todavía.
      </p>
    );
  }

  function remove(note: Note) {
    startTransition(async () => {
      await deleteNote(note.id);
      toast("Nota eliminada", {
        description: note.title,
      });
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {notes.map((note) => (
          <motion.li
            key={note.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-zinc-900"
          >
            <button
              className="flex-1 text-left text-sm"
              disabled={isPending}
              onClick={() =>
                startTransition(() => toggleNotePinned(note.id, note.pinned))
              }
            >
              {note.title}
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={note.pinned ? "Desanclar nota" : "Anclar nota"}
              aria-pressed={note.pinned}
              disabled={isPending}
              onClick={() =>
                startTransition(() => toggleNotePinned(note.id, note.pinned))
              }
            >
              <Pin
                className={
                  note.pinned ? "size-4 fill-current text-amber-500" : "size-4"
                }
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Eliminar nota"
              disabled={isPending}
              onClick={() => remove(note)}
            >
              <Trash2 className="size-4 text-zinc-400 hover:text-destructive" />
            </Button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
