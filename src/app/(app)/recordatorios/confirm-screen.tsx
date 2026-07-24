"use client";

import { useTransition } from "react";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { SlideToConfirm } from "@/components/ui/slide-to-confirm";
import { DynamicConfirmForm } from "./dynamic-confirm-form";
import type { FormFieldDef, FormValues } from "@/lib/form-schema";

export function ConfirmScreen({
  title,
  description,
  confirmMode,
  formSchema,
  onConfirm,
  onSubmitForm,
}: {
  title: string;
  description: string | null;
  confirmMode: "SLIDER" | "FORM";
  formSchema: FormFieldDef[];
  onConfirm?: () => Promise<void>;
  onSubmitForm?: (data: FormValues) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      {confirmMode === "SLIDER" && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
        >
          <CheckCircle2 className="size-10 text-foreground/70" />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col items-center gap-1 text-center"
      >
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </motion.div>

      {confirmMode === "SLIDER" ? (
        <SlideToConfirm
          disabled={isPending}
          onConfirm={() => {
            if (onConfirm) startTransition(() => onConfirm());
          }}
        />
      ) : (
        <DynamicConfirmForm
          schema={formSchema}
          submitting={isPending}
          onSubmit={(data) => {
            if (onSubmitForm) startTransition(() => onSubmitForm(data));
          }}
        />
      )}
    </main>
  );
}
