import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/recurrence";
import { appNow } from "@/lib/timezone";
import { completeTaskFromScreen, completeTaskWithData } from "../../actions";
import { ConfirmScreen } from "../../confirm-screen";
import type { FormFieldDef } from "@/lib/form-schema";

export const dynamic = "force-dynamic";

// Lets a COMPOUND task (slider or form) be confirmed directly from the task
// list — tapping the reminder itself, instead of a quick toggle/checkbox —
// without needing to wait for its push notification. Reuses the exact same
// ConfirmScreen (slider or dynamic form) as the push-notification confirm
// screen at recordatorios/confirmar/[notificationId].
export default async function CompletarPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  if (!task || task.trackingType !== "COMPOUND") notFound();

  const today = dateKey(appNow());
  const confirmMode = task.confirmMode ?? "SLIDER";

  const onConfirm =
    confirmMode === "SLIDER" ? completeTaskFromScreen.bind(null, task.id, today) : undefined;
  const onSubmitForm =
    confirmMode === "FORM" ? completeTaskWithData.bind(null, task.id, today) : undefined;

  return (
    <ConfirmScreen
      title={task.title}
      description={task.description}
      confirmMode={confirmMode}
      formSchema={(task.formSchema as FormFieldDef[] | null) ?? []}
      onConfirm={onConfirm}
      onSubmitForm={onSubmitForm}
    />
  );
}
