import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { timingSafeEqual } from "node:crypto";

// ~10 years — effectively "never expires" for a personal single-user app.
const SESSION_MAX_AGE = 60 * 60 * 24 * 365 * 10;

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize(credentials) {
        const username = String(credentials?.username ?? "");
        const password = String(credentials?.password ?? "");
        const validUser = process.env.APP_USERNAME ?? "";
        const validPass = process.env.APP_PASSWORD ?? "";

        if (!validUser || !validPass) return null;
        if (safeEqual(username, validUser) && safeEqual(password, validPass)) {
          return { id: "owner", name: validUser };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  pages: {
    signIn: "/login",
  },
});
