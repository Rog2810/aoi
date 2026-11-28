import type { MissedSession, Session, TimeboxEntry } from "../domain/types";
import { addDays } from "./dates";

/** A day's unfinished sessions are released at this hour the next morning (becomes a Settings item later). */
export const DAY_END_HOUR = 4;
/** Nothing is released while a session was started, paused or finished within this many minutes. */
export const RECENT_ACTIVITY_MINUTES = 60;

/** When a local date counts as over for sessions: the cutoff hour on the next day. Local time, so DST is handled. */
export function dayEndsAt(dateKey: string, cutoffHour: number = DAY_END_HOUR): Date {
  const [y, m, d] = addDays(dateKey, 1).split("-").map(Number);
  return new Date(y, m - 1, d, cutoffHour, 0, 0, 0);
}

const slotOrder = (a: TimeboxEntry, b: TimeboxEntry) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute;

/** Scheduled sessions that were never started and whose (latest) slot's day has ended. Pure: the caller does the writes. */
export function sessionsToRelease(sessions: Session[], entries: TimeboxEntry[], at: Date, cutoffHour: number = DAY_END_HOUR): { session: Session; entry: TimeboxEntry }[] {
  const out: { session: Session; entry: TimeboxEntry }[] = [];
  for (const session of sessions) {
    if (session.status !== "scheduled") continue;
    const last = entries.filter((e) => e.sourceType === "session" && e.sourceId === session.id).sort(slotOrder).pop();
    if (last && at.getTime() >= dayEndsAt(last.date, cutoffHour).getTime()) out.push({ session, entry: last });
  }
  return out;
}

/** True when a session was started or paused, or anything was completed, within the last hour: someone is mid-flow. */
export function recentlyActive(sessions: Session[], completedAts: string[], at: Date, minutes: number = RECENT_ACTIVITY_MINUTES): boolean {
  const since = at.getTime() - minutes * 60_000;
  return sessions.some((s) => s.lastActiveAt !== undefined && Date.parse(s.lastActiveAt) >= since) || completedAts.some((t) => Date.parse(t) >= since);
}

/** The id comes from the session and slot, so writing it twice is harmless (no duplicate records). */
export function missedRecord(s: Session, e: TimeboxEntry, at: Date): MissedSession {
  const now = at.toISOString();
  return { id: `${s.id}@${e.date}:${e.startMinute}`, sessionId: s.id, ownerType: s.ownerType, ownerId: s.ownerId, date: e.date, startMinute: e.startMinute, endMinute: e.endMinute, plannedMinutes: s.plannedMinutes, createdAt: now, updatedAt: now, revision: 1 };
}
