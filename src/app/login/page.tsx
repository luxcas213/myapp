import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        username: formData.get("username"),
        password: formData.get("password"),
        redirectTo: "/",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login?error=1");
      }
      throw err;
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold">Mi App</h1>
      <form action={login} className="flex w-full max-w-xs flex-col gap-3">
        <input
          name="username"
          placeholder="Usuario"
          autoComplete="username"
          required
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          autoComplete="current-password"
          required
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        />
        {error && (
          <p className="text-sm text-red-500">Usuario o contraseña incorrectos.</p>
        )}
        <button
          type="submit"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
