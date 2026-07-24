"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Home, ListTodo, NotebookText } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/recordatorios", label: "Recordatorios", icon: ListTodo },
  { href: "/notas", label: "Notas", icon: NotebookText },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-t border-black/10 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="relative flex-1">
              {active && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-x-3 top-0.5 h-0.5 rounded-full bg-foreground"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs transition-colors active:scale-95",
                  active
                    ? "text-foreground"
                    : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
