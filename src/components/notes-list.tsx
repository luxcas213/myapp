"use client";

import { useTransition } from "react";
import { toggleNotePinned, deleteNote } from "@/app/actions";

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
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No hay notas todavía.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {notes.map((note) => (
        <li
          key={note.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-4 py-3 dark:border-white/10"
        >
          <button
            className="flex-1 text-left text-sm"
            disabled={isPending}
            onClick={() =>
              startTransition(() => toggleNotePinned(note.id, note.pinned))
            }
          >
            {note.pinned ? "📌 " : ""}
            {note.title}
          </button>
          <button
            aria-label="Eliminar"
            className="text-xs text-zinc-400 hover:text-red-500"
            disabled={isPending}
            onClick={() => startTransition(() => deleteNote(note.id))}
          >
            Eliminar
          </button>
        </li>
      ))}
    </ul>
  );
}
