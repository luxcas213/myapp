"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Chip } from "@/components/ui/chip";
import { createTask, updateTask } from "./actions";
import { FieldBuilder } from "./field-builder";
import type { Recurrence } from "@/lib/recurrence";
import type { FormFieldDef } from "@/lib/form-schema";

type NotificationRow = {
  key: string;
  time: string; // "HH:mm" — the alert's clock time either way
  daysBefore: number; // only meaningful for date-based recurrence (NONE/MONTHLY)
  requireConfirmation: boolean;
};

type TaskFormValue = {
  id: string;
  title: string;
  description: string | null;
  message: string | null;
  trackingType: "SIMPLE" | "COMPOUND";
  confirmMode: "SLIDER" | "FORM" | null;
  formSchema: FormFieldDef[] | null;
  dueDate: Date | null;
  dueHasTime: boolean;
  recurrence: Recurrence | null;
  tags: { name: string }[];
  notifications: {
    timeOfDay: number | null;
    daysBefore: number | null;
    requireConfirmation: boolean;
  }[];
};

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
const MAX_DAYS_BEFORE = 90;

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

function Stepper({
  value,
  onChange,
  max = MAX_DAYS_BEFORE,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-black/10 p-1 dark:border-white/10">
      <button
        type="button"
        aria-label="Restar"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex size-6 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold dark:bg-zinc-800"
      >
        −
      </button>
      <span className="w-6 text-center font-mono text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Sumar"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-6 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold dark:bg-zinc-800"
      >
        +
      </button>
    </div>
  );
}

function MonthDayGrid({
  days,
  lastDay,
  onToggleDay,
  onToggleLastDay,
}: {
  days: number[];
  lastDay: boolean;
  onToggleDay: (day: number) => void;
  onToggleLastDay: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            type="button"
            aria-pressed={days.includes(day)}
            onClick={() => onToggleDay(day)}
            className={
              "flex aspect-square items-center justify-center rounded-md border font-mono text-xs tabular-nums transition-colors " +
              (days.includes(day)
                ? "border-foreground bg-foreground text-background"
                : "border-black/10 dark:border-white/10")
            }
          >
            {day}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={lastDay}
        onClick={onToggleLastDay}
        className={
          "rounded-md border px-3 py-2 text-xs font-medium transition-colors " +
          (lastDay
            ? "border-foreground bg-foreground text-background"
            : "border-black/10 dark:border-white/10")
        }
      >
        Último día del mes
      </button>
    </div>
  );
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
    "NONE" | "DAILY" | "WEEKDAYS" | "MONTHLY"
  >(task?.recurrence?.type ?? "NONE");
  const isDateBased = recurrenceType === "NONE" || recurrenceType === "MONTHLY";

  const [weekdays, setWeekdays] = useState<number[]>(
    task?.recurrence?.type === "WEEKDAYS" ? task.recurrence.days : []
  );
  const [monthlyDays, setMonthlyDays] = useState<number[]>(
    task?.recurrence?.type === "MONTHLY" ? task.recurrence.days : []
  );
  const [monthlyLastDay, setMonthlyLastDay] = useState(
    task?.recurrence?.type === "MONTHLY" ? task.recurrence.lastDay : false
  );

  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
  );
  const [dueHasTime, setDueHasTime] = useState(task?.dueHasTime ?? false);
  const [dueTime, setDueTime] = useState(
    task?.dueDate && task.dueHasTime ? new Date(task.dueDate).toISOString().slice(11, 16) : "09:00"
  );

  const [notifications, setNotifications] = useState<NotificationRow[]>(
    task?.notifications.map((n, i) => ({
      key: String(i),
      time: minutesToTime(n.timeOfDay ?? 540),
      daysBefore: n.daysBefore ?? 0,
      requireConfirmation: n.requireConfirmation,
    })) ?? []
  );

  const [trackingType, setTrackingType] = useState<"SIMPLE" | "COMPOUND">(
    task?.trackingType ?? "SIMPLE"
  );
  const [confirmMode, setConfirmMode] = useState<"SLIDER" | "FORM">(
    task?.confirmMode ?? "SLIDER"
  );
  const [formFields, setFormFields] = useState<FormFieldDef[]>(task?.formSchema ?? []);

  const [moreOpen, setMoreOpen] = useState(false);

  function addNotification() {
    setNotifications((rows) => [
      ...rows,
      { key: crypto.randomUUID(), time: "09:00", daysBefore: 0, requireConfirmation: false },
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

  function toggleMonthlyDay(day: number) {
    setMonthlyDays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  }

  function toggleWeekday(day: number) {
    setWeekdays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);

    formData.set("recurrenceType", recurrenceType);
    if (recurrenceType === "WEEKDAYS") {
      formData.set("weekdays", JSON.stringify(weekdays));
    } else if (recurrenceType === "MONTHLY") {
      formData.set("monthlyDays", JSON.stringify(monthlyDays));
      formData.set("monthlyLastDay", String(monthlyLastDay));
    } else if (recurrenceType === "NONE") {
      formData.set("dueHasTime", String(dueHasTime));
      if (dueHasTime) formData.set("dueTime", dueTime);
    }

    const notificationsPayload = notifications.map((n) => ({
      timeOfDay: timeToMinutes(n.time),
      daysBefore: isDateBased ? n.daysBefore : null,
      requireConfirmation: n.requireConfirmation,
    }));
    formData.set("notifications", JSON.stringify(notificationsPayload));

    formData.set("trackingType", trackingType);
    if (trackingType === "COMPOUND") {
      formData.set("confirmMode", confirmMode);
      if (confirmMode === "FORM") {
        formData.set("formSchema", JSON.stringify(formFields));
      }
    }

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 py-6">
      <input
        name="title"
        required
        defaultValue={task?.title}
        placeholder="¿Qué querés recordar?"
        className="border-b border-black/10 bg-transparent pb-3 text-xl font-semibold outline-none placeholder:text-muted-foreground placeholder:font-medium focus:border-foreground dark:border-white/10"
      />

      <div className="flex flex-col gap-2">
        <Label>Repetición</Label>
        <div className="flex flex-wrap gap-2">
          <Chip pressed={recurrenceType === "NONE"} onClick={() => setRecurrenceType("NONE")}>
            Una vez
          </Chip>
          <Chip pressed={recurrenceType === "DAILY"} onClick={() => setRecurrenceType("DAILY")}>
            Todos los días
          </Chip>
          <Chip
            pressed={recurrenceType === "WEEKDAYS"}
            onClick={() => setRecurrenceType("WEEKDAYS")}
          >
            Días de semana
          </Chip>
          <Chip pressed={recurrenceType === "MONTHLY"} onClick={() => setRecurrenceType("MONTHLY")}>
            Mensual
          </Chip>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={recurrenceType}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            {recurrenceType === "NONE" && (
              <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-3 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fecha</span>
                  <Input
                    type="date"
                    name="dueDate"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-fit"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-black/10 pt-3 dark:border-white/10">
                  <span className="text-sm">Tiene hora puntual</span>
                  <Switch checked={dueHasTime} onCheckedChange={setDueHasTime} />
                </div>
                <AnimatePresence initial={false}>
                  {dueHasTime && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between overflow-hidden"
                    >
                      <span className="text-sm text-muted-foreground">Hora del evento</span>
                      <Input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="w-fit"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {recurrenceType === "WEEKDAYS" && (
              <div className="flex gap-1.5">
                {WEEKDAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={weekdays.includes(i)}
                    aria-label={label}
                    onClick={() => toggleWeekday(i)}
                    className={
                      "flex size-9 items-center justify-center rounded-full border text-xs font-semibold transition-colors " +
                      (weekdays.includes(i)
                        ? "border-foreground bg-foreground text-background"
                        : "border-black/10 dark:border-white/10")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {recurrenceType === "MONTHLY" && (
              <MonthDayGrid
                days={monthlyDays}
                lastDay={monthlyLastDay}
                onToggleDay={toggleMonthlyDay}
                onToggleLastDay={() => setMonthlyLastDay((v) => !v)}
              />
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
          <p className="text-sm text-muted-foreground">Sin avisos configurados todavía.</p>
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
              <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  {isDateBased ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span>Avisame</span>
                      <Stepper
                        value={n.daysBefore}
                        onChange={(v) => updateNotification(n.key, { daysBefore: v })}
                      />
                      <span>{n.daysBefore === 0 ? "días antes (hoy mismo)" : "días antes"}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Hora del aviso</span>
                  )}
                  <button
                    type="button"
                    aria-label="Eliminar aviso"
                    onClick={() => removeNotification(n.key)}
                    className="shrink-0 text-zinc-400 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">a las</span>
                    <Input
                      type="time"
                      value={n.time}
                      onChange={(e) => updateNotification(n.key, { time: e.target.value })}
                      className="w-fit"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confirmar</span>
                    <Switch
                      checked={n.requireConfirmation}
                      onCheckedChange={(checked) =>
                        updateNotification(n.key, { requireConfirmation: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Seguimiento</Label>
        <div className="flex flex-wrap gap-2">
          <Chip pressed={trackingType === "SIMPLE"} onClick={() => setTrackingType("SIMPLE")}>
            Solo notificación
          </Chip>
          <Chip pressed={trackingType === "COMPOUND"} onClick={() => setTrackingType("COMPOUND")}>
            Con historial y progreso
          </Chip>
        </div>
        <p className="text-xs text-muted-foreground">
          {trackingType === "SIMPLE"
            ? "Te avisa y listo — no queda registrado en ningún lado, no aparece en Progreso."
            : "Queda en Progreso con racha y calendario. Elegí abajo cómo confirmás cada vez."}
        </p>

        <AnimatePresence initial={false}>
          {trackingType === "COMPOUND" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-3 overflow-hidden"
            >
              <div className="flex flex-wrap gap-2">
                <Chip pressed={confirmMode === "SLIDER"} onClick={() => setConfirmMode("SLIDER")}>
                  Deslizar para confirmar
                </Chip>
                <Chip pressed={confirmMode === "FORM"} onClick={() => setConfirmMode("FORM")}>
                  Formulario personalizado
                </Chip>
              </div>

              {confirmMode === "SLIDER" ? (
                <p className="rounded-lg border border-black/10 p-3 text-xs text-muted-foreground dark:border-white/10">
                  Al tocar la notificación, deslizás para confirmar — sirve para hábitos donde
                  solo importa si lo hiciste o no.
                </p>
              ) : (
                <FieldBuilder value={formFields} onChange={setFormFields} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-2 border-t border-black/10 pt-2 dark:border-white/10">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex items-center justify-between py-2 text-sm font-medium text-muted-foreground"
        >
          Más opciones
          <motion.span animate={{ rotate: moreOpen ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight className="size-4" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {moreOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-4 overflow-hidden pb-2"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={task?.description ?? ""}
                  placeholder="Opcional"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="message">Mensaje de la notificación</Label>
                <Textarea
                  id="message"
                  name="message"
                  defaultValue={task?.message ?? ""}
                  placeholder="Se arma automático si lo dejás vacío (el título)"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button type="submit" disabled={isPending} className="mt-2">
        {task ? "Guardar cambios" : "Crear recordatorio"}
      </Button>
    </form>
  );
}
