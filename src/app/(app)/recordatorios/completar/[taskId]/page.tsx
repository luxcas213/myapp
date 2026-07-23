import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/recurrence";
import { appNow } from "@/lib/timezone";
import { completeTaskWithData } from "../../actions";
import { ConfirmScreen } from "../../confirm-screen";
import type { FormFieldDef } from "@/lib/form-schema";

export const dynamic = "force-dynamic";

// Lets a COMPOUND + FORM task be filled out directly from the task list
// ("Completar" link), without needing to wait for its push notification —
// reuses the same dynamic form renderer as the notification confirm screen.
export default async function CompletarPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  if (!task || task.trackingType !== "COMPOUND" || task.confirmMode !== "FORM") notFound();

  const today = dateKey(appNow());
  const onSubmitForm = completeTaskWithData.bind(null, task.id, today);

  return (
    <ConfirmScreen
      title={task.title}
      description={task.description}
      confirmMode="FORM"
      formSchema={(task.formSchema as FormFieldDef[] | null) ?? []}
      onSubmitForm={onSubmitForm}
    />
  );
}
