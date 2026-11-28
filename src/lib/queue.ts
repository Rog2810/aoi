import type { Session, TimeboxEntry } from "../domain/types";
import { dayEndsAt } from "./missed";

export const QUEUE_KEY = "aoi.sessionQueue.v1";

const activity = (s: Session) => Date.parse(s.lastActiveAt ?? s.updatedAt) || 0;

/**
 * Today's session queue. `pending` is already in time order. Order: the pinned session, then started sessions with
 * the one worked on most recently first, then the rest by time, then skipped sessions in the order they were skipped.
 */
export function orderQueue<T extends { session: Session }>(pending: T[], skipped: string[], pinned?: T): T[] {
  const rest = pending.filter((i) => i.session.id !== pinned?.session.id);
  const live = rest.filter((i) => !skipped.includes(i.session.id));
  const started = live.filter((i) => i.session.status === "in-progress").sort((a, b) => activity(b.session) - activity(a.session));
  const waiting = live.filter((i) => i.session.status !== "in-progress");
  const skippedItems = skipped.flatMap((id) => rest.filter((i) => i.session.id === id));
  return [...(pinned ? [pinned] : []), ...started, ...waiting, ...skippedItems];
}

export interface StoredQueue { skipped: string[]; pinnedId: string | null }

/** Reads the saved skip order. Anything from another day, or anything malformed, is ignored. Only session ids are stored. */
export function readQueueState(raw: string | null, today: string): StoredQueue {
  const none: StoredQueue = { skipped: [], pinnedId: null };
  if (!raw) return none;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return none;
    const o = v as { date?: unknown; skipped?: unknown; pinnedId?: unknown };
    if (o.date !== today) return none;
    return {
      skipped: Array.isArray(o.skipped) ? o.skipped.filter((x): x is string => typeof x === "string") : [],
      pinnedId: typeof o.pinnedId === "string" ? o.pinnedId : null,
    };
  } catch {
    return none;
  }
}

/**
 * Which timebox entries belong in today's queue: today's, any started session's (whatever its date, so work that
 * crosses midnight keeps going), and earlier days' until their day has ended. Sorted by date, then start time.
 */
export function queueEntries(entries: TimeboxEntry[], sessions: Session[], today: string, now: Date): TimeboxEntry[] {
  return entries
    .filter((e) => {
      if (e.sourceType !== "session") return false;
      if (e.date === today) return true;
      if (e.date > today) return false;
      const s = sessions.find((x) => x.id === e.sourceId);
      return s?.status === "in-progress" || now.getTime() < dayEndsAt(e.date).getTime();
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute);
}
