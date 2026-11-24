import type { CompletionRecord, Session } from "../domain/types";
import { toDateKey } from "./dates";

export const remainingMinutes = (s: Pick<Session, "plannedMinutes" | "completedMinutes">): number =>
  Math.max(0, s.plannedMinutes - s.completedMinutes);

/**
 * Deterministic estimate -> logical sessions (180 min / 45 min => 4 x 45). The last session takes any remainder.
 * EXTENSION POINT: placement, ordering and burnout balancing belong in a future SchedulingService that
 * consumes these sessions and writes TimeboxEntry records. This function must stay placement-free.
 */
export function generateSessions(taskId: string, estimateMinutes: number, preferredMinutes: number | undefined, nowIso: string): Session[] {
  if (estimateMinutes <= 0) return [];
  const size = preferredMinutes && preferredMinutes > 0 ? preferredMinutes : estimateMinutes;
  const count = Math.ceil(estimateMinutes / size);
  return Array.from({ length: count }, (_, i) => ({
    id: `${taskId}:s${i + 1}`,
    ownerType: "task" as const,
    ownerId: taskId,
    sequence: i + 1,
    plannedMinutes: i === count - 1 ? estimateMinutes - size * i : size,
    completedMinutes: 0,
    status: "unscheduled" as const,
    createdAt: nowIso,
    updatedAt: nowIso,
    revision: 1,
  }));
}

/** A new on-demand session for a task or project; its number continues after the owner's existing sessions. */
export function newSession(ownerType: Session["ownerType"], ownerId: string, existing: Session[], plannedMinutes: number, at: Date): Session {
  const sequence = Math.max(0, ...existing.filter((s) => s.ownerId === ownerId).map((s) => s.sequence)) + 1;
  const now = at.toISOString();
  // Project sessions are created and deleted on demand, so they get a random id that is never reused.
  const id = ownerType === "project" ? crypto.randomUUID() : `${ownerId}:s${sequence}`;
  return { id, ownerType, ownerId, sequence, plannedMinutes, completedMinutes: 0, status: "unscheduled", createdAt: now, updatedAt: now, revision: 1 };
}
/** Real minutes logged across all of an owner's sessions. */
export const spentOn = (ownerId: string, sessions: Session[]): number =>
  sessions.filter((s) => s.ownerId === ownerId).reduce((n, s) => n + s.completedMinutes, 0);

export const PAUSE_NUDGE_MINUTES = 5; // a paused session shows a reminder after this long
export const PAUSE_LIMIT_MINUTES = 60; // a session paused this long is ended
export const MIN_LEFTOVER_MINUTES = 5; // no leftover session when less than this is left

/** Minutes since a started session last ran or was paused, or null when it is not started. */
export function idleMinutes(s: Session, at: Date): number | null {
  if (s.status !== "in-progress") return null;
  return (at.getTime() - Date.parse(s.lastActiveAt ?? s.updatedAt)) / 60_000;
}

export const sessionCompletion = (sessionId: string, minutes: number, at: Date): CompletionRecord => ({
  id: crypto.randomUUID(),
  sourceId: sessionId,
  sourceType: "session",
  completedAt: at.toISOString(),
  localDate: toDateKey(at),
  minutesSpent: minutes,
  retroactive: false,
  createdAt: at.toISOString(),
});

/**
 * Ends a sitting on a session that was worked on but not finished. The worked part becomes its own completed session
 * (same id and timebox slot, planned = worked), and a task gets a new waiting session for what is left, so planned
 * minutes still add up to the estimate. Projects have no total to finish, so they get no leftover.
 */
export function splitSession(s: Session, workedMinutes: number, existing: Session[], at: Date): { done: Session; leftover?: Session } {
  const worked = Math.max(1, workedMinutes);
  const done: Session = { ...s, plannedMinutes: worked, completedMinutes: worked, status: "completed", lastActiveAt: undefined, updatedAt: at.toISOString(), revision: s.revision + 1 };
  const remaining = s.plannedMinutes - worked;
  const leftover = s.ownerType === "task" && remaining >= MIN_LEFTOVER_MINUTES ? newSession("task", s.ownerId, existing, remaining, at) : undefined;
  return { done, leftover };
}
