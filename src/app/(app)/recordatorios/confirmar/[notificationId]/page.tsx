import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { dateKey } from "@/lib/recurrence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmFromNotification } from "../../actions";

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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <CheckCircle2 className="size-10 text-foreground/70" />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold">{notification.task.title}</h1>
        {notification.task.description && (
          <p className="text-sm text-muted-foreground">
            {notification.task.description}
          </p>
        )}
      </div>

      <form action={confirm} className="flex w-full max-w-xs flex-col gap-3">
        {notification.task.trackingType === "LOGGED" && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="value">Valor (opcional)</Label>
              <Input id="value" name="value" type="number" step="any" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Nota (opcional)</Label>
              <Input id="note" name="note" />
            </div>
          </>
        )}
        <Button type="submit" size="lg">
          Confirmar
        </Button>
      </form>
    </main>
  );
}
