"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";
import { ConfirmScreen } from "./confirm-screen";
import type { FormFieldDef } from "@/lib/form-schema";

export function PreviewOverlay({
  title,
  description,
  confirmMode,
  formSchema,
  onClose,
}: {
  title: string;
  description: string | null;
  confirmMode: "SLIDER" | "FORM";
  formSchema: FormFieldDef[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-zinc-50 dark:bg-black"
    >
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] dark:border-white/10">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Vista previa — no se guarda
        </span>
        <button
          type="button"
          aria-label="Cerrar vista previa"
          onClick={onClose}
          className="text-zinc-400 hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      <ConfirmScreen
        title={title.trim() || "Sin título"}
        description={description}
        confirmMode={confirmMode}
        formSchema={formSchema}
        onConfirm={async () => onClose()}
        onSubmitForm={async () => onClose()}
      />
    </motion.div>
  );
}
