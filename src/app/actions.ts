"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function createNote(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  await prisma.note.create({
    data: { title, content: "" },
  });
  revalidatePath("/");
}

export async function toggleNotePinned(id: string, pinned: boolean) {
  await prisma.note.update({
    where: { id },
    data: { pinned: !pinned },
  });
  revalidatePath("/");
}

export async function deleteNote(id: string) {
  await prisma.note.delete({ where: { id } });
  revalidatePath("/");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
