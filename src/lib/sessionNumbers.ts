import type { CompletionRecord, Session, TimeboxEntry } from "../domain/types";

const pad = (n: number) => String(n).padStart(4, "0");

/** When a session is planned (its slot) or happened (its completion), as a sortable "YYYY-MM-DD HHMM"; null when it is only waiting. */
function whenKey(s: Session, entries: TimeboxEntry[], completions: CompletionRecord[]): string | null {
  const slot = entries.filter((e) => e.sourceType === "session" && e.sourceId === s.id).map((e) => `${e.date} ${pad(e.startMinute)}`).sort()[0];
  if (slot) return slot;
  if (s.status !== "completed") return null;
  const rec = completions.filter((c) => c.sourceType === "session" && c.sourceId === s.id).sort((a, b) => a.completedAt.localeCompare(b.completedAt)).pop();
  if (!rec) return null;
  const d = new Date(rec.completedAt);
  return `${rec.localDate} ${pad(d.getHours() * 60 + d.getMinutes())}`;
}

/**
 * Display numbers per owner. Sessions that are placed on the timebox or already happened are numbered 1, 2, 3 in time
 * order; waiting ones continue after them in creation order, so the top waiting card is always n + 1. Nothing is stored:
 * scheduling, unscheduling or dragging a session renumbers everything by itself.
 */
export function sessionNumbers(sessions: Session[], entries: TimeboxEntry[], completions: CompletionRecord[]): Map<string, number> {
  const out = new Map<string, number>();
  const byOwner = new Map<string, Session[]>();
  for (const s of sessions) byOwner.set(s.ownerId, [...(byOwner.get(s.ownerId) ?? []), s]);
  for (const list of byOwner.values()) {
    const timed: { s: Session; key: string }[] = [];
    const waiting: Session[] = [];
    for (const s of list) {
      const key = whenKey(s, entries, completions);
      if (key) timed.push({ s, key });
      else waiting.push(s);
    }
    timed.sort((a, b) => a.key.localeCompare(b.key) || a.s.sequence - b.s.sequence);
    waiting.sort((a, b) => a.sequence - b.sequence);
    [...timed.map((x) => x.s), ...waiting].forEach((s, i) => out.set(s.id, i + 1));
  }
  return out;
}

/** Sessions of one owner that are placed or finished: the n in "the top card shows n + 1". */
export function settledCount(ownerId: string, sessions: Session[], entries: TimeboxEntry[], completions: CompletionRecord[]): number {
  return sessions.filter((s) => s.ownerId === ownerId && whenKey(s, entries, completions) !== null).length;
}
