import { signOutAction } from "@/app/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="text-xs text-zinc-500 dark:text-zinc-400">
        Salir
      </button>
    </form>
  );
}
