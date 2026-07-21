"use server";

import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createNote(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  await prisma.note.create({
    data: { userId, title, content: "" },
  });
  revalidatePath("/");
}

export async function toggleNotePinned(id: string, pinned: boolean) {
  const userId = await requireUserId();
  await prisma.note.updateMany({
    where: { id, userId },
    data: { pinned: !pinned },
  });
  revalidatePath("/");
}

export async function deleteNote(id: string) {
  const userId = await requireUserId();
  await prisma.note.deleteMany({ where: { id, userId } });
  revalidatePath("/");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
