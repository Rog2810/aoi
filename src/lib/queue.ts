import type { Session } from "../domain/types";

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
