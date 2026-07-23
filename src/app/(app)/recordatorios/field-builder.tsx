"use client";

import { Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FIELD_TYPE_LABELS,
  SUBFIELD_TYPES,
  type FormFieldDef,
  type FormFieldType,
} from "@/lib/form-schema";

function newField(type: FormFieldType = "TEXT"): FormFieldDef {
  return {
    id: crypto.randomUUID(),
    name: "",
    type,
    ...(type === "GROUP" ? { fields: [] } : {}),
  };
}

function SubFieldRow({
  field,
  onChange,
  onRemove,
}: {
  field: FormFieldDef;
  onChange: (f: FormFieldDef) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={field.name}
        onChange={(e) => onChange({ ...field, name: e.target.value })}
        placeholder="Nombre del sub-campo"
        className="flex-1"
      />
      <Select
        value={field.type}
        onValueChange={(v) => onChange({ ...field, type: v as FormFieldType })}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUBFIELD_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {FIELD_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        aria-label="Eliminar sub-campo"
        onClick={onRemove}
        className="shrink-0 text-zinc-400 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function FieldRow({
  field,
  onChange,
  onRemove,
}: {
  field: FormFieldDef;
  onChange: (f: FormFieldDef) => void;
  onRemove: () => void;
}) {
  const isGroup = field.type === "GROUP";

  function addSubField() {
    onChange({ ...field, fields: [...(field.fields ?? []), newField()] });
  }
  function updateSubField(id: string, patch: FormFieldDef) {
    onChange({
      ...field,
      fields: (field.fields ?? []).map((f) => (f.id === id ? patch : f)),
    });
  }
  function removeSubField(id: string) {
    onChange({ ...field, fields: (field.fields ?? []).filter((f) => f.id !== id) });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-center gap-2">
        <Input
          value={field.name}
          onChange={(e) => onChange({ ...field, name: e.target.value })}
          placeholder="Nombre del campo"
          className="flex-1"
        />
        <Select
          value={field.type}
          onValueChange={(v) => {
            const type = v as FormFieldType;
            onChange({
              ...field,
              type,
              fields: type === "GROUP" ? (field.fields ?? []) : undefined,
              options: type === "SELECT" ? (field.options ?? []) : undefined,
            });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {FIELD_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          aria-label="Eliminar campo"
          onClick={onRemove}
          className="shrink-0 text-zinc-400 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {field.type === "SELECT" && (
        <Input
          value={(field.options ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...field,
              options: e.target.value
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean),
            })
          }
          placeholder="Opciones separadas por coma"
        />
      )}

      <AnimatePresence initial={false}>
        {isGroup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="ml-4 overflow-hidden border-l-2 border-black/10 pl-3 dark:border-white/10"
          >
            <div className="flex flex-col gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                Qué campos tiene cada repetición:
              </span>
              {(field.fields ?? []).map((sf) => (
                <SubFieldRow
                  key={sf.id}
                  field={sf}
                  onChange={(patch) => updateSubField(sf.id, patch)}
                  onRemove={() => removeSubField(sf.id)}
                />
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addSubField}
                className="w-fit"
              >
                <Plus className="size-3.5" /> Agregar sub-campo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FieldBuilder({
  value,
  onChange,
}: {
  value: FormFieldDef[];
  onChange: (fields: FormFieldDef[]) => void;
}) {
  function addField() {
    onChange([...value, newField()]);
  }
  function updateField(id: string, patch: FormFieldDef) {
    onChange(value.map((f) => (f.id === id ? patch : f)));
  }
  function removeField(id: string) {
    onChange(value.filter((f) => f.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {value.map((f) => (
          <motion.div
            key={f.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FieldRow
              field={f}
              onChange={(patch) => updateField(f.id, patch)}
              onRemove={() => removeField(f.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      <Button type="button" variant="outline" size="sm" onClick={addField} className="w-fit">
        <Plus className="size-4" /> Agregar campo
      </Button>
    </div>
  );
}
