"use client";

import { AnimatePresence, motion } from "motion/react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EASE_OUT, POP_SPRING } from "@/lib/motion";

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function LoginCard({
  error,
  action,
}: {
  error: boolean;
  action: (formData: FormData) => void;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
      className="w-full max-w-xs"
    >
      <Card>
        <CardHeader className="items-center text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...POP_SPRING, delay: 0.05 }}
            className="mb-2 flex size-10 items-center justify-center rounded-full bg-foreground/10"
          >
            <LockKeyhole className="size-5" />
          </motion.div>
          <motion.div variants={fieldVariants} transition={EASE_OUT}>
            <CardTitle className="text-xl">Mi App</CardTitle>
          </motion.div>
          <motion.div variants={fieldVariants} transition={EASE_OUT}>
            <CardDescription>Ingresá tus datos para continuar</CardDescription>
          </motion.div>
        </CardHeader>
        <CardContent>
          <form action={action} className="flex flex-col gap-4">
            <motion.div variants={fieldVariants} transition={EASE_OUT} className="flex flex-col gap-2">
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" name="username" autoComplete="username" required />
            </motion.div>
            <motion.div variants={fieldVariants} transition={EASE_OUT} className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </motion.div>
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={EASE_OUT}
                  className="overflow-hidden text-sm text-destructive"
                >
                  Usuario o contraseña incorrectos.
                </motion.p>
              )}
            </AnimatePresence>
            <motion.div variants={fieldVariants} transition={EASE_OUT}>
              <Button type="submit" className="mt-2 w-full">
                Entrar
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
