"use client";

import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList, type ListedTask } from "./task-list";
import { ProgressView, type ProgressTask } from "./progress-view";
import { HistoryView, type PastTask } from "./history-view";

type TabKey = "activos" | "progreso" | "historial";
const ORDER: TabKey[] = ["activos", "progreso", "historial"];

const slideVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: 16 * direction }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: -16 * direction }),
};

export function RecordatoriosTabs({
  hoy,
  proximas,
  sinFecha,
  progressTasks,
  pastTasks,
}: {
  hoy: ListedTask[];
  proximas: ListedTask[];
  sinFecha: ListedTask[];
  progressTasks: ProgressTask[];
  pastTasks: PastTask[];
}) {
  const [tab, setTab] = useState<TabKey>("activos");
  const [direction, setDirection] = useState(1);

  function selectTab(next: TabKey) {
    setDirection(ORDER.indexOf(next) > ORDER.indexOf(tab) ? 1 : -1);
    setTab(next);
  }

  return (
    <Tabs value={tab} onValueChange={(v) => selectTab(v as TabKey)}>
      <TabsList>
        <TabsTrigger value="activos">Activos</TabsTrigger>
        <TabsTrigger value="progreso">Progreso</TabsTrigger>
        <TabsTrigger value="historial">Historial</TabsTrigger>
      </TabsList>

      <div className="relative mt-3 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          {tab === "activos" && (
            <motion.div
              key="activos"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <TaskList hoy={hoy} proximas={proximas} sinFecha={sinFecha} />
            </motion.div>
          )}
          {tab === "progreso" && (
            <motion.div
              key="progreso"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <ProgressView tasks={progressTasks} />
            </motion.div>
          )}
          {tab === "historial" && (
            <motion.div
              key="historial"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <HistoryView tasks={pastTasks} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Tabs>
  );
}
