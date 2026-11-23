import type { Session } from "../domain/types";

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
  return { id: `${ownerId}:s${sequence}`, ownerType, ownerId, sequence, plannedMinutes, completedMinutes: 0, status: "unscheduled", createdAt: now, updatedAt: now, revision: 1 };
}
