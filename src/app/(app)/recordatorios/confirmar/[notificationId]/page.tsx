import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/recurrence";
import { confirmFromNotification, confirmFromNotificationWithData } from "../../actions";
import { ConfirmScreen } from "../../confirm-screen";
import type { FormFieldDef } from "@/lib/form-schema";

export const dynamic = "force-dynamic";

export default async function ConfirmarPage({
  params,
}: {
  params: Promise<{ notificationId: string }>;
}) {
  const { notificationId } = await params;

  const notification = await prisma.taskNotification.findUnique({
    where: { id: notificationId },
    include: { task: true },
  });

  if (!notification) notFound();

  const today = dateKey(new Date());
  const task = notification.task;
  const confirmMode = task.confirmMode ?? "SLIDER";

  const onConfirm = confirmFromNotification.bind(null, task.id, today, notification.id);
  const onSubmitForm = confirmFromNotificationWithData.bind(null, task.id, today, notification.id);

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
