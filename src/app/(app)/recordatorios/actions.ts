"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TrackingType } from "@/generated/prisma/enums";
import type { Recurrence } from "@/lib/recurrence";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/recordatorios");
}

type NotificationInput = {
  timeOfDay?: number | null;
  sendAt?: string | null;
  requireConfirmation: boolean;
};

function parseTaskFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const trackingType: TrackingType =
    formData.get("trackingType") === "LOGGED" ? TrackingType.LOGGED : TrackingType.SIMPLE;
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

  const recurrenceRaw = String(formData.get("recurrence") ?? "");
  const recurrence: Recurrence | null = recurrenceRaw ? JSON.parse(recurrenceRaw) : null;

  const notificationsRaw = String(formData.get("notifications") ?? "[]");
  const notifications: NotificationInput[] = JSON.parse(notificationsRaw);

  const tagsRaw = String(formData.get("tags") ?? "");
  const tagNames = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return { title, description, trackingType, dueDate, recurrence, notifications, tagNames };
}

export async function createTask(formData: FormData) {
  const { title, description, trackingType, dueDate, recurrence, notifications, tagNames } =
    parseTaskFields(formData);
  if (!title) return;

  await prisma.task.create({
    data: {
      title,
      description,
      trackingType,
      dueDate: recurrence ? null : dueDate,
      recurrence: recurrence ?? undefined,
      tags: {
        connectOrCreate: tagNames.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
      notifications: {
        create: notifications.map((n) => ({
          timeOfDay: n.timeOfDay ?? null,
          sendAt: n.sendAt ? new Date(n.sendAt) : null,
          requireConfirmation: n.requireConfirmation,
        })),
      },
    },
  });

  revalidateAll();
}

export async function updateTask(id: string, formData: FormData) {
  const { title, description, trackingType, dueDate, recurrence, notifications, tagNames } =
    parseTaskFields(formData);
  if (!title) return;

  await prisma.$transaction([
    prisma.taskNotification.deleteMany({ where: { taskId: id } }),
    prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        trackingType,
        dueDate: recurrence ? null : dueDate,
        recurrence: recurrence ?? undefined,
        tags: {
          set: [],
          connectOrCreate: tagNames.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
        notifications: {
          create: notifications.map((n) => ({
            timeOfDay: n.timeOfDay ?? null,
            sendAt: n.sendAt ? new Date(n.sendAt) : null,
            requireConfirmation: n.requireConfirmation,
          })),
        },
      },
    }),
  ]);

  revalidateAll();
}

export async function archiveTask(id: string) {
  await prisma.task.update({ where: { id }, data: { active: false } });
  revalidateAll();
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
  revalidateAll();
}

export async function completeTask(
  taskId: string,
  forDate: string,
  note?: string,
  value?: number
) {
  await prisma.taskCompletion.upsert({
    where: { taskId_forDate: { taskId, forDate: new Date(forDate) } },
    create: { taskId, forDate: new Date(forDate), note, value },
    update: { note, value },
  });
  revalidateAll();
}

export async function uncompleteTask(taskId: string, forDate: string) {
  await prisma.taskCompletion.deleteMany({
    where: { taskId, forDate: new Date(forDate) },
  });
  revalidateAll();
}

/** Used by the push-notification confirmation screen (a plain <form>). */
export async function confirmFromNotification(
  taskId: string,
  forDate: string,
  notificationId: string,
  formData: FormData
) {
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const valueRaw = String(formData.get("value") ?? "").trim();
  const value = valueRaw ? Number(valueRaw) : undefined;

  await prisma.$transaction([
    prisma.taskCompletion.upsert({
      where: { taskId_forDate: { taskId, forDate: new Date(forDate) } },
      create: { taskId, forDate: new Date(forDate), note, value },
      update: { note, value },
    }),
    prisma.taskNotification.update({
      where: { id: notificationId },
      data: { lastFiredForDate: new Date(forDate) },
    }),
  ]);

  revalidateAll();
  redirect("/recordatorios");
}
