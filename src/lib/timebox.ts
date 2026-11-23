import type { CalendarEvent, TimeboxEntry } from "../domain/types";
import { occursOn } from "./events";

export const SNAP_MINUTES = 5;

/** "HH:mm" to minutes from midnight, or null when it is malformed. */
export function parseTime(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

export interface Placement { sessionId: string; date: string; startMinute: number; endMinute: number }

const overlap = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

/**
 * Why a placement is not allowed, or null when it is. Rules: five-minute snapping, inside one day, no overlap with
 * exclusive events or with other timebox entries. Events marked allows-parallel-work may be overlapped.
 * EXTENSION POINT: the Schedule dialog, the drag-and-drop timebox and the future scheduler all call this function.
 */
export function placementError(p: Placement, entries: TimeboxEntry[], events: CalendarEvent[]): string | null {
  if (p.startMinute % SNAP_MINUTES !== 0) return "Start times snap to five minutes.";
  if (p.startMinute < 0 || p.endMinute > 1440) return "A session has to fit inside one day.";
  const clash = events.find((e) => e.overlapPolicy === "exclusive" && occursOn(e, p.date) && overlap(p.startMinute, p.endMinute, e.startMinute, e.endMinute));
  if (clash) return `That time overlaps “${clash.title}”, which does not allow other work.`;
  const other = entries.find((e) => e.date === p.date && e.sourceId !== p.sessionId && overlap(p.startMinute, p.endMinute, e.startMinute, e.endMinute));
  if (other) return "That time overlaps another scheduled item.";
  return null;
}
