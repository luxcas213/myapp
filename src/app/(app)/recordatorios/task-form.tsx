"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createTask, updateTask } from "./actions";
import type { Recurrence } from "@/lib/recurrence";

type NotificationRow = {
  key: string;
  time: string; // "HH:mm" for recurring, or datetime-local string for one-off
  requireConfirmation: boolean;
};

type TaskFormValue = {
  id: string;
  title: string;
  description: string | null;
  trackingType: "SIMPLE" | "LOGGED";
  dueDate: Date | null;
  recurrence: Recurrence | null;
  tags: { name: string }[];
  notifications: {
    timeOfDay: number | null;
    sendAt: Date | null;
    requireConfirmation: boolean;
  }[];
};

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function TaskForm({
  task,
  existingTags,
}: {
  task?: TaskFormValue;
  existingTags: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [recurrenceType, setRecurrenceType] = useState<
    "NONE" | Recurrence["type"]
  >(task?.recurrence?.type ?? "NONE");
  const [weekdays, setWeekdays] = useState<string[]>(
    task?.recurrence?.type === "WEEKDAYS"
      ? task.recurrence.days.map(String)
      : []
  );
  const [intervalN, setIntervalN] = useState(
    task?.recurrence?.type === "INTERVAL" ? task.recurrence.n : 2
  );
  const [intervalUnit, setIntervalUnit] = useState<"DAY" | "WEEK">(
    task?.recurrence?.type === "INTERVAL" ? task.recurrence.unit : "DAY"
  );
  const [monthlyDay, setMonthlyDay] = useState(
    task?.recurrence?.type === "MONTHLY" ? task.recurrence.day : 1
  );
  const [yearlyMonth, setYearlyMonth] = useState(
    task?.recurrence?.type === "YEARLY" ? task.recurrence.month : 1
  );
  const [yearlyDay, setYearlyDay] = useState(
    task?.recurrence?.type === "YEARLY" ? task.recurrence.day : 1
  );

  const [notifications, setNotifications] = useState<NotificationRow[]>(
    task?.notifications.map((n, i) => ({
      key: String(i),
      time:
        n.timeOfDay != null
          ? minutesToTime(n.timeOfDay)
          : n.sendAt
            ? new Date(n.sendAt).toISOString().slice(0, 16)
            : "09:00",
      requireConfirmation: n.requireConfirmation,
    })) ?? []
  );

  function addNotification() {
    setNotifications((rows) => [
      ...rows,
      { key: crypto.randomUUID(), time: "09:00", requireConfirmation: false },
    ]);
  }

  function removeNotification(key: string) {
    setNotifications((rows) => rows.filter((r) => r.key !== key));
  }

  function updateNotification(key: string, patch: Partial<NotificationRow>) {
    setNotifications((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);

    let recurrence: Recurrence | null = null;
    if (recurrenceType === "DAILY") recurrence = { type: "DAILY" };
    else if (recurrenceType === "WEEKDAYS")
      recurrence = { type: "WEEKDAYS", days: weekdays.map(Number) };
    else if (recurrenceType === "INTERVAL")
      recurrence = {
        type: "INTERVAL",
        unit: intervalUnit,
        n: intervalN,
        // Preserve the original anchor on edit so the interval's phase
        // doesn't shift; a brand-new task anchors to today.
        anchor:
          task?.recurrence?.type === "INTERVAL"
            ? task.recurrence.anchor
            : new Date().toISOString(),
      };
    else if (recurrenceType === "MONTHLY")
      recurrence = { type: "MONTHLY", day: monthlyDay };
    else if (recurrenceType === "YEARLY")
      recurrence = { type: "YEARLY", month: yearlyMonth, day: yearlyDay };

    formData.set("recurrence", recurrence ? JSON.stringify(recurrence) : "");

    const notificationsPayload = notifications.map((n) => ({
      timeOfDay: recurrence ? timeToMinutes(n.time) : null,
      sendAt: recurrence ? null : new Date(n.time).toISOString(),
      requireConfirmation: n.requireConfirmation,
    }));
    formData.set("notifications", JSON.stringify(notificationsPayload));

    startTransition(async () => {
      if (task) {
        await updateTask(task.id, formData);
      } else {
        await createTask(formData);
      }
      router.push("/recordatorios");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={task?.title}
          placeholder="Ej: Pagar el alquiler"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={task?.description ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tags">Etiquetas (separadas por coma)</Label>
        <Input
          id="tags"
          name="tags"
          list="existing-tags"
          defaultValue={task?.tags.map((t) => t.name).join(", ")}
          placeholder="trabajo, trámites, ..."
        />
        <datalist id="existing-tags">
          {existingTags.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Seguimiento</Label>
        <Select name="trackingType" defaultValue={task?.trackingType ?? "SIMPLE"}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SIMPLE">Simple (hecho / no hecho)</SelectItem>
            <SelectItem value="LOGGED">
              Con historial (confirmás y guarda un registro)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Repetición</Label>
        <Select
          value={recurrenceType}
          onValueChange={(v) => setRecurrenceType(v as typeof recurrenceType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Puntual (una fecha límite)</SelectItem>
            <SelectItem value="DAILY">Todos los días</SelectItem>
            <SelectItem value="WEEKDAYS">Días específicos de la semana</SelectItem>
            <SelectItem value="INTERVAL">Cada X días/semanas</SelectItem>
            <SelectItem value="MONTHLY">Mensual</SelectItem>
            <SelectItem value="YEARLY">Anual</SelectItem>
          </SelectContent>
        </Select>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={recurrenceType}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            {recurrenceType === "NONE" && (
              <Input
                type="date"
                name="dueDate"
                defaultValue={
                  task?.dueDate
                    ? new Date(task.dueDate).toISOString().slice(0, 10)
                    : ""
                }
              />
            )}

            {recurrenceType === "WEEKDAYS" && (
              <ToggleGroup
                multiple
                value={weekdays}
                onValueChange={(value) => setWeekdays(value)}
                className="justify-start"
              >
                {WEEKDAY_LABELS.map((label, i) => (
                  <ToggleGroupItem key={i} value={String(i)} aria-label={label}>
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}

            {recurrenceType === "INTERVAL" && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Cada</span>
                <Input
                  type="number"
                  min={1}
                  className="w-16"
                  value={intervalN}
                  onChange={(e) => setIntervalN(Number(e.target.value))}
                />
                <Select
                  value={intervalUnit}
                  onValueChange={(v) => setIntervalUnit(v as "DAY" | "WEEK")}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAY">días</SelectItem>
                    <SelectItem value="WEEK">semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {recurrenceType === "MONTHLY" && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Día del mes</span>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="w-20"
                  value={monthlyDay}
                  onChange={(e) => setMonthlyDay(Number(e.target.value))}
                />
              </div>
            )}

            {recurrenceType === "YEARLY" && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Mes</span>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  className="w-16"
                  value={yearlyMonth}
                  onChange={(e) => setYearlyMonth(Number(e.target.value))}
                />
                <span className="text-sm">Día</span>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="w-16"
                  value={yearlyDay}
                  onChange={(e) => setYearlyDay(Number(e.target.value))}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Avisos</Label>
          <Button type="button" variant="outline" size="sm" onClick={addNotification}>
            <Plus className="size-4" /> Agregar aviso
          </Button>
        </div>

        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sin avisos configurados todavía.
          </p>
        )}

        <AnimatePresence initial={false}>
          {notifications.map((n) => (
            <motion.div
              key={n.key}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-lg border border-black/10 p-3 dark:border-white/10">
                <Input
                  type={recurrenceType === "NONE" ? "datetime-local" : "time"}
                  value={n.time}
                  onChange={(e) => updateNotification(n.key, { time: e.target.value })}
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={n.requireConfirmation}
                    onCheckedChange={(checked) =>
                      updateNotification(n.key, { requireConfirmation: checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground">Confirmar</span>
                </div>
                <button
                  type="button"
                  aria-label="Eliminar aviso"
                  onClick={() => removeNotification(n.key)}
                  className="text-zinc-400 hover:text-red-500"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Button type="submit" disabled={isPending} className="mt-2">
        {task ? "Guardar cambios" : "Crear recordatorio"}
      </Button>
    </form>
  );
}
