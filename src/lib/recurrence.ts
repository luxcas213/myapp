import {
  differenceInCalendarDays,
  format,
  getDate,
  getDay,
  getDaysInMonth,
  isSameDay,
  startOfDay,
  subDays,
} from "date-fns";

export type Recurrence =
  | { type: "DAILY" }
  | { type: "WEEKDAYS"; days: number[] } // 0 = Sunday .. 6 = Saturday
  | { type: "MONTHLY"; days: number[]; lastDay: boolean }; // days: 1-31 picks; lastDay: also fires on the real last day of the month (28-31), independent of picking 31 itself

const DATE_KEY = "yyyy-MM-dd";

export function dateKey(date: Date): string {
  return format(date, DATE_KEY);
}

/** Whether a recurring task's occurrence is scheduled to happen on `date`. */
export function isTaskDueOn(recurrence: Recurrence, date: Date): boolean {
  const day = startOfDay(date);

  switch (recurrence.type) {
    case "DAILY":
      return true;
    case "WEEKDAYS":
      return recurrence.days.includes(getDay(day));
    case "MONTHLY": {
      const dayOfMonth = getDate(day);
      if (recurrence.lastDay && dayOfMonth === getDaysInMonth(day)) return true;
      return (recurrence.days ?? []).includes(dayOfMonth);
    }
    default:
      // Guards against stale data from a dropped recurrence type (e.g. the
      // old INTERVAL/YEARLY shapes) — treat as never due rather than throw.
      return false;
  }
}

/**
 * Whether a task — recurring OR one-off ("Una vez", a plain `dueDate`) —
 * has an occurrence scheduled on `date`. Recurring tasks defer to
 * `isTaskDueOn`; one-off tasks match their single `dueDate` day exactly.
 */
export function isOccurrenceDueOn(
  task: { recurrence: Recurrence | null; dueDate: Date | null },
  date: Date
): boolean {
  if (task.recurrence) return isTaskDueOn(task.recurrence, date);
  if (task.dueDate) return isSameDay(task.dueDate, date);
  return false;
}

export type Streak = { current: number; longest: number };

/**
 * Walks backward from `today` (up to a year) evaluating only the dates the
 * task was actually due, per its recurrence rule. `current` counts the
 * unbroken run of completed due-dates ending at the most recent due date
 * that has already passed (today's own occurrence doesn't count against the
 * streak until the day is over). `longest` is the best run found in the
 * lookback window.
 */
export function computeStreak(
  recurrence: Recurrence,
  completedDateKeys: ReadonlySet<string>,
  today: Date = new Date()
): Streak {
  const start = startOfDay(today);
  const dueDates: Date[] = [];

  for (let i = 0; i < 366 && dueDates.length < 366; i++) {
    const d = subDays(start, i);
    if (isTaskDueOn(recurrence, d)) dueDates.push(d);
  }
  // dueDates[0] is today (if due today), most recent first.

  let longest = 0;
  let run = 0;
  for (const d of dueDates) {
    if (completedDateKeys.has(dateKey(d))) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  // Skip today's own due-date when counting the *current* streak only if
  // it's not completed yet — an incomplete "today" shouldn't break a streak
  // while the day isn't over, but a completed "today" should count.
  const isTodayDue = dueDates[0] && dateKey(dueDates[0]) === dateKey(start);
  const isTodayDone = isTodayDue && completedDateKeys.has(dateKey(dueDates[0]));
  const forCurrent = isTodayDue && !isTodayDone ? dueDates.slice(1) : dueDates;

  let current = 0;
  for (const d of forCurrent) {
    if (completedDateKeys.has(dateKey(d))) current++;
    else break;
  }

  return { current, longest };
}

/** Calendar days between `from` and `to` (can be negative). */
export function daysBetween(from: Date, to: Date): number {
  return differenceInCalendarDays(startOfDay(to), startOfDay(from));
}
