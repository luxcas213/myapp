// Shape for a COMPOUND + FORM task's custom confirm-screen fields
// (`Task.formSchema`). Built via the free-form field builder in the task
// form, rendered dynamically by the confirm screen. GROUP fields are one
// level deep only — a GROUP cannot contain another GROUP.

export type FormFieldType =
  | "TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "DATE"
  | "TIME"
  | "SELECT"
  | "GROUP";

export type FormFieldDef = {
  id: string;
  name: string;
  type: FormFieldType;
  options?: string[]; // SELECT only
  fields?: FormFieldDef[]; // GROUP only — the sub-fields repeated per instance
};

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  BOOLEAN: "Sí / No",
  DATE: "Fecha",
  TIME: "Hora",
  SELECT: "Opciones",
  GROUP: "Múltiple (grupo)",
};

// Sub-fields inside a GROUP can't themselves be GROUP (one level deep only).
export const SUBFIELD_TYPES: FormFieldType[] = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
  "TIME",
  "SELECT",
];

/** Value shape stored in `TaskCompletion.data`, keyed by field id. */
export type FormValues = Record<string, FormFieldValue>;
export type FormFieldValue =
  | string
  | number
  | boolean
  | null
  | Record<string, string | number | boolean | null>[]; // GROUP: one object per instance
