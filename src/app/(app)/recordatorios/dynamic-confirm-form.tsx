"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EASE_OUT } from "@/lib/motion";
import type { FormFieldDef, FormValues } from "@/lib/form-schema";

type ScalarValue = string | number | boolean | null;
type GroupInstance = Record<string, ScalarValue>;

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormFieldDef;
  value: ScalarValue;
  onChange: (v: ScalarValue) => void;
}) {
  switch (field.type) {
    case "NUMBER":
      return (
        <Input
          type="number"
          step="any"
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    case "BOOLEAN":
      return <Switch checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} />;
    case "DATE":
      return (
        <Input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "TIME":
      return (
        <Input
          type="time"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "SELECT":
      return (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-black/10 bg-background px-3 py-2 text-sm dark:border-white/10"
        >
          <option value="" disabled>
            Elegí una opción
          </option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case "TEXT":
    default:
      return (
        <Input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function GroupBlock({
  field,
  instances,
  onChange,
}: {
  field: FormFieldDef;
  instances: GroupInstance[];
  onChange: (instances: GroupInstance[]) => void;
}) {
  const subfields = field.fields ?? [];
  // Stable per-instance keys so AnimatePresence can animate the right card
  // in/out on add/remove instead of keying off the array index (which
  // would shift and mis-animate every card after the one removed).
  const [keys, setKeys] = useState<string[]>(() => instances.map(() => crypto.randomUUID()));

  function addInstance() {
    setKeys((k) => [...k, crypto.randomUUID()]);
    onChange([...instances, {}]);
  }
  function removeInstance(index: number) {
    setKeys((k) => k.filter((_, i) => i !== index));
    onChange(instances.filter((_, i) => i !== index));
  }
  function updateInstance(index: number, subId: string, v: ScalarValue) {
    onChange(instances.map((inst, i) => (i === index ? { ...inst, [subId]: v } : inst)));
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">{field.name}</span>
      <AnimatePresence initial={false}>
        {instances.map((inst, i) => (
          <motion.div
            key={keys[i] ?? i}
            layout
            initial={{ opacity: 0, height: 0, scale: 0.96 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.96 }}
            transition={EASE_OUT}
            className="overflow-hidden"
          >
            <div className="relative flex flex-col gap-3 rounded-lg border border-black/10 p-3 dark:border-white/10">
              <button
                type="button"
                aria-label={`Eliminar ${field.name}`}
                onClick={() => removeInstance(i)}
                className="absolute right-2 top-2 text-zinc-400 hover:text-destructive"
              >
                <X className="size-4" />
              </button>
              {subfields.map((sf) => (
                <div key={sf.id} className="flex flex-col gap-1.5 pr-6">
                  <label className="text-xs font-medium text-muted-foreground">{sf.name}</label>
                  <FieldInput
                    field={sf}
                    value={inst[sf.id] ?? null}
                    onChange={(v) => updateInstance(i, sf.id, v)}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button type="button" variant="outline" size="sm" onClick={addInstance} className="w-fit">
        <Plus className="size-4" /> Agregar otro/a {field.name.toLowerCase()}
      </Button>
    </div>
  );
}

export function DynamicConfirmForm({
  schema,
  onSubmit,
  submitting,
}: {
  schema: FormFieldDef[];
  onSubmit: (data: FormValues) => void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<FormValues>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-4 text-left">
      {schema.map((field) => {
        if (field.type === "GROUP") {
          const instances = (values[field.id] as GroupInstance[] | undefined) ?? [];
          return (
            <GroupBlock
              key={field.id}
              field={field}
              instances={instances}
              onChange={(next) => setValues((v) => ({ ...v, [field.id]: next }))}
            />
          );
        }
        return (
          <div key={field.id} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">{field.name}</label>
            <FieldInput
              field={field}
              value={(values[field.id] as ScalarValue) ?? null}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
            />
          </div>
        );
      })}
      <Button type="submit" size="lg" disabled={submitting}>
        Guardar
      </Button>
    </form>
  );
}
