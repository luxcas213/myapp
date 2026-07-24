import { NavBar } from "@/components/nav-bar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-[env(safe-area-inset-top)]">
        {children}
      </main>
      <NavBar />
    </div>
  );
}
