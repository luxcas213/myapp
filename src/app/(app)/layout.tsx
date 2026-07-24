import { NavBar } from "@/components/nav-bar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pt-[env(safe-area-inset-top)] pb-16 dark:bg-black">
      {children}
      <NavBar />
    </div>
  );
}
