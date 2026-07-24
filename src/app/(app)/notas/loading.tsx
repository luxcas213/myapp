import { Skeleton } from "@/components/ui/skeleton";

export default function NotasLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-4 py-4 dark:border-white/10">
        <h1 className="text-lg font-semibold">Notas</h1>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        <Skeleton className="h-9 w-full" />

        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </main>
    </div>
  );
}
