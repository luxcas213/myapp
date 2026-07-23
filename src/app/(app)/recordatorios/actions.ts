"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { TrackingType, ConfirmMode } from "@/generated/prisma/enums";
import type { Recurrence } from "@/lib/recurrence";
import type { FormFieldDef, FormValues } from "@/lib/form-schema";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/recordatorios");
}

type NotificationInput = {
  timeOfDay?: number | null;
  daysBefore?: number | null;
  requireConfirmation: boolean;
};

function parseTaskFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;

  const trackingType: TrackingType =
    formData.get("trackingType") === "COMPOUND" ? TrackingType.COMPOUND : TrackingType.SIMPLE;

  let confirmMode: ConfirmMode | null = null;
  let formSchema: FormFieldDef[] | null = null;
  if (trackingType === TrackingType.COMPOUND) {
    confirmMode = formData.get("confirmMode") === "FORM" ? ConfirmMode.FORM : ConfirmMode.SLIDER;
    if (confirmMode === ConfirmMode.FORM) {
      const raw = String(formData.get("formSchema") ?? "[]");
      formSchema = JSON.parse(raw);
    }
  }

  const recurrenceType = String(formData.get("recurrenceType") ?? "NONE");
  let recurrence: Recurrence | null = null;
  let dueDate: Date | null = null;
  let dueHasTime = false;

  if (recurrenceType === "DAILY") {
    recurrence = { type: "DAILY" };
  } else if (recurrenceType === "WEEKDAYS") {
    const days = JSON.parse(String(formData.get("weekdays") ?? "[]")) as number[];
    recurrence = { type: "WEEKDAYS", days };
  } else if (recurrenceType === "MONTHLY") {
    const days = JSON.parse(String(formData.get("monthlyDays") ?? "[]")) as number[];
    const lastDay = formData.get("monthlyLastDay") === "true";
    recurrence = { type: "MONTHLY", days, lastDay };
  } else {
    // "Una vez" — has a date, optionally a specific time of day.
    const dueDateRaw = String(formData.get("dueDate") ?? "");
    dueHasTime = formData.get("dueHasTime") === "true";
    if (dueDateRaw) {
      const dueTimeRaw = String(formData.get("dueTime") ?? "");
      dueDate =
        dueHasTime && dueTimeRaw ? new Date(`${dueDateRaw}T${dueTimeRaw}`) : new Date(dueDateRaw);
    }
  }

  const notificationsRaw = String(formData.get("notifications") ?? "[]");
  const notifications: NotificationInput[] = JSON.parse(notificationsRaw);

  const tagsRaw = String(formData.get("tags") ?? "");
  const tagNames = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    title,
    description,
    message,
    trackingType,
    confirmMode,
    formSchema,
    dueDate,
    dueHasTime,
    recurrence,
    notifications,
    tagNames,
  };
}

export async function createTask(formData: FormData) {
  const {
    title,
    description,
    message,
    trackingType,
    confirmMode,
    formSchema,
    dueDate,
    dueHasTime,
    recurrence,
    notifications,
    tagNames,
  } = parseTaskFields(formData);
  if (!title) return;

  await prisma.task.create({
    data: {
      title,
      description,
      message,
      trackingType,
      confirmMode,
      formSchema: formSchema ?? undefined,
      dueDate: recurrence ? null : dueDate,
      dueHasTime: recurrence ? false : dueHasTime,
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
          daysBefore: n.daysBefore ?? null,
          requireConfirmation: n.requireConfirmation,
        })),
      },
    },
  });

  revalidateAll();
}

export async function updateTask(id: string, formData: FormData) {
  const {
    title,
    description,
    message,
    trackingType,
    confirmMode,
    formSchema,
    dueDate,
    dueHasTime,
    recurrence,
    notifications,
    tagNames,
  } = parseTaskFields(formData);
  if (!title) return;

  await prisma.$transaction([
    prisma.taskNotification.deleteMany({ where: { taskId: id } }),
    prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        message,
        trackingType,
        confirmMode,
        formSchema:
          formSchema ??
          (trackingType === TrackingType.COMPOUND ? undefined : Prisma.JsonNull),
        dueDate: recurrence ? null : dueDate,
        dueHasTime: recurrence ? false : dueHasTime,
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
            daysBefore: n.daysBefore ?? null,
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

/** Simple confirm (slider) — no form data, just marks the occurrence done. */
export async function completeTask(taskId: string, forDate: string) {
  await prisma.taskCompletion.upsert({
    where: { taskId_forDate: { taskId, forDate: new Date(forDate) } },
    create: { taskId, forDate: new Date(forDate) },
    update: {},
  });
  revalidateAll();
}

export async function uncompleteTask(taskId: string, forDate: string) {
  await prisma.taskCompletion.deleteMany({
    where: { taskId, forDate: new Date(forDate) },
  });
  revalidateAll();
}

/** Form-mode confirm, filled directly from the task list (no push involved). */
export async function completeTaskWithData(taskId: string, forDate: string, data: FormValues) {
  await prisma.taskCompletion.upsert({
    where: { taskId_forDate: { taskId, forDate: new Date(forDate) } },
    create: { taskId, forDate: new Date(forDate), data },
    update: { data },
  });
  revalidateAll();
  redirect("/recordatorios");
}

/** Used by the push-notification confirmation screen (slider mode). */
export async function confirmFromNotification(
  taskId: string,
  forDate: string,
  notificationId: string
) {
  await prisma.$transaction([
    prisma.taskCompletion.upsert({
      where: { taskId_forDate: { taskId, forDate: new Date(forDate) } },
      create: { taskId, forDate: new Date(forDate) },
      update: {},
    }),
    prisma.taskNotification.update({
      where: { id: notificationId },
      data: { lastFiredForDate: new Date(forDate) },
    }),
  ]);

  revalidateAll();
  redirect("/recordatorios");
}

/** Used by the push-notification confirmation screen (form mode). */
export async function confirmFromNotificationWithData(
  taskId: string,
  forDate: string,
  notificationId: string,
  data: FormValues
) {
  await prisma.$transaction([
    prisma.taskCompletion.upsert({
      where: { taskId_forDate: { taskId, forDate: new Date(forDate) } },
      create: { taskId, forDate: new Date(forDate), data },
      update: { data },
    }),
    prisma.taskNotification.update({
      where: { id: notificationId },
      data: { lastFiredForDate: new Date(forDate) },
    }),
  ]);

  revalidateAll();
  redirect("/recordatorios");
}
