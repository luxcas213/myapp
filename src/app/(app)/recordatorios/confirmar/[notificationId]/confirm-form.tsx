"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfirmForm({
  title,
  description,
  logged,
  action,
}: {
  title: string;
  description: string | null;
  logged: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 pt-[calc(1.5rem+env(safe-area-inset-top))]"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
      >
        <CheckCircle2 className="size-10 text-foreground/70" />
      </motion.div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <form action={action} className="flex w-full max-w-xs flex-col gap-3">
        {logged && (
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
    </motion.main>
  );
}
