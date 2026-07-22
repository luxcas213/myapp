import {
  differenceInCalendarDays,
  format,
  getDate,
  getDay,
  getMonth,
  isBefore,
  startOfDay,
  subDays,
} from "date-fns";

export type Recurrence =
  | { type: "DAILY" }
  | { type: "WEEKDAYS"; days: number[] } // 0 = Sunday .. 6 = Saturday
  | { type: "INTERVAL"; unit: "DAY" | "WEEK"; n: number; anchor: string } // anchor: ISO date string
  | { type: "MONTHLY"; day: number } // 1-31
  | { type: "YEARLY"; month: number; day: number }; // month: 1-12

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
    case "INTERVAL": {
      const anchor = startOfDay(new Date(recurrence.anchor));
      if (isBefore(day, anchor)) return false;
      const diffDays = differenceInCalendarDays(day, anchor);
      const stepDays = recurrence.unit === "WEEK" ? recurrence.n * 7 : recurrence.n;
      return diffDays % stepDays === 0;
    }
    case "MONTHLY":
      return getDate(day) === recurrence.day;
    case "YEARLY":
      return getMonth(day) + 1 === recurrence.month && getDate(day) === recurrence.day;
  }
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
