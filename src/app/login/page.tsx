import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { LoginCard } from "./login-card";

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
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] dark:bg-black">
      <LoginCard error={!!error} action={login} />
    </main>
  );
}
