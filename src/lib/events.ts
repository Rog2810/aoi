import type { CalendarEvent } from "../domain/types";
import { daysBetween } from "./dates";

/** Does this event, or one of its repeats, fall on the local date `key`? Extend here for richer recurrence. */
export function occursOn(e: Pick<CalendarEvent, "date" | "recurrence">, key: string): boolean {
  const gap = daysBetween(e.date, key);
  if (gap < 0) return false;
  switch (e.recurrence) {
    case "never": return gap === 0;
    case "daily": return true;
    case "weekly": return gap % 7 === 0;
    case "monthly": return key.slice(8) === e.date.slice(8);
  }
}
