import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/recurrence";
import { confirmFromNotification } from "../../actions";
import { ConfirmForm } from "./confirm-form";

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
  const confirm = confirmFromNotification.bind(
    null,
    notification.task.id,
    today,
    notification.id
  );

  return (
    <ConfirmForm
      title={notification.task.title}
      description={notification.task.description}
      logged={notification.task.trackingType === "LOGGED"}
      action={confirm}
    />
  );
}
