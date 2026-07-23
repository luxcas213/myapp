// This is a single-owner app for someone in Argentina — "today"/"now" for
// scheduling purposes (which reminders are due, what counts as "hoy") must
// mean Argentina wall-clock time, not the server's.
//
// Vercel serverless functions run with the process clock in UTC. Every
// date-fns/native `Date` getter used elsewhere in this app (getDate,
// getDay, getMonth, getHours, startOfDay, isSameDay, ...) reads the
// *local* timezone of whatever JS environment it runs in — so on the
// server that's UTC. Argentina doesn't observe DST (fixed UTC-3
// year-round), so shifting a UTC instant back by exactly 3 hours makes
// its local (= UTC, on the server) calendar/time fields equal Argentina's
// wall-clock values. Pass the result of `appNow()` anywhere "today" or
// "the current time" needs to reflect the owner's actual clock.
const ARGENTINA_UTC_OFFSET_HOURS = -3;

export function appNow(): Date {
  return new Date(Date.now() + ARGENTINA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
}
