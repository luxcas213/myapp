import { Check, X } from "lucide-react";

export type PastTask = {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
};

export function HistoryView({ tasks }: { tasks: PastTask[] }) {
  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay recordatorios puntuales vencidos.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((t) => (
        <li
          key={t.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-4 py-3 dark:border-white/10"
        >
          <div>
            <p className="text-sm">{t.title}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(t.dueDate).toLocaleDateString("es-AR")}
            </p>
          </div>
          {t.done ? (
            <Check className="size-4 text-green-500" />
          ) : (
            <X className="size-4 text-red-500" />
          )}
        </li>
      ))}
    </ul>
  );
}
