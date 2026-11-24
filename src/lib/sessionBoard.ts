import type { Project, Session, Task, TimeboxEntry } from "../domain/types";
import { sortByDue } from "./tasks";

export type SessionColumn = "unscheduled" | "scheduled" | "projects";
export type SessionGroup =
  | { kind: "task"; task: Task; sessions: Session[] }
  | { kind: "project"; project: Project; sessions: Session[] };
export type BoardGroups = Record<SessionColumn, SessionGroup[]>;

const push = (m: Map<string, Session[]>, key: string, s: Session) => m.set(key, [...(m.get(key) ?? []), s]);

/**
 * Open task sessions are split by whether they have a timebox slot. A project's waiting sessions (no slot) go to
 * Projects, which always lists every active project; its placed sessions go to Scheduled under the project name.
 * Completed sessions are not on the board (the timebox shows them). One group per task or project per column.
 */
export function groupSessions(tasks: Task[], projects: Project[], sessions: Session[], entries: TimeboxEntry[]): BoardGroups {
  const slotKey = (id: string) =>
    entries.filter((e) => e.sourceType === "session" && e.sourceId === id).map((e) => `${e.date} ${String(e.startMinute).padStart(4, "0")}`).sort()[0] ?? "~";
  const order = (a: Session, b: Session) => slotKey(a.id).localeCompare(slotKey(b.id)) || a.sequence - b.sequence; // placed ones first, by time

  const byTask = { unscheduled: new Map<string, Session[]>(), scheduled: new Map<string, Session[]>() };
  const waiting = new Map<string, Session[]>();
  const placed = new Map<string, Session[]>();
  for (const s of sessions) {
    if (s.status === "completed") continue;
    const hasSlot = slotKey(s.id) !== "~";
    if (s.ownerType === "project") {
      const p = projects.find((x) => x.id === s.ownerId);
      if (p && p.status !== "archived") push(hasSlot ? placed : waiting, p.id, s);
      continue;
    }
    const t = tasks.find((x) => x.id === s.ownerId);
    if (!t || t.status === "cancelled" || t.status === "completed") continue;
    push(byTask[hasSlot ? "scheduled" : "unscheduled"], t.id, s);
  }

  const taskGroups = (m: Map<string, Session[]>): SessionGroup[] =>
    tasks.filter((t) => m.has(t.id)).sort(sortByDue).map((t) => ({ kind: "task", task: t, sessions: [...(m.get(t.id) ?? [])].sort(order) }));
  const projectGroups = (m: Map<string, Session[]>, keepEmpty: boolean): SessionGroup[] =>
    projects
      .filter((p) => p.status !== "archived" && (keepEmpty || m.has(p.id)))
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((p) => ({ kind: "project", project: p, sessions: [...(m.get(p.id) ?? [])].sort(order) }));

  return {
    unscheduled: taskGroups(byTask.unscheduled),
    scheduled: [...taskGroups(byTask.scheduled), ...projectGroups(placed, false)],
    projects: projectGroups(waiting, true),
  };
}

/** One segment per session of a task, in order, for the progress strip. */
export function segmentsFor(sessions: Session[], ownerId: string): ("done" | "half" | "empty")[] {
  return sessions
    .filter((s) => s.ownerId === ownerId)
    .sort((a, b) => a.sequence - b.sequence)
    .map((s) => (s.status === "completed" ? "done" : s.status === "in-progress" || s.completedMinutes > 0 ? "half" : "empty"));
}
