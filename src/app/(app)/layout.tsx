import { NavBar } from "@/components/nav-bar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col pb-16">
      {children}
      <NavBar />
    </div>
  );
}
