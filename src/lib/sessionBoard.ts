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
  const placed = new Map<string, Session[]>();
  for (const s of sessions) {
    if (s.status === "completed") continue;
    const hasSlot = slotKey(s.id) !== "~";
    if (s.ownerType === "project") {
      const p = projects.find((x) => x.id === s.ownerId);
      if (p && p.status !== "archived" && hasSlot) push(placed, p.id, s); // waiting project sessions are not stored: the board adds the next card itself
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
    projects: projectGroups(new Map(), true),
  };
}

export type Segment = "done" | "half" | "upcoming" | "missed" | "waiting";

/**
 * One segment per session of an owner, for the progress strip. Order: done and started (by time), upcoming, missed,
 * then waiting, so the empty segments sit together on the right. "Missed" is a scheduled session that never started
 * and whose day has passed; it stays visible (dashed) until the sweep releases it.
 */
export function segmentsFor(sessions: Session[], ownerId: string, entries: TimeboxEntry[], today: string): Segment[] {
  const slot = (id: string) =>
    entries.filter((e) => e.sourceType === "session" && e.sourceId === id).map((e) => `${e.date} ${String(e.startMinute).padStart(4, "0")}`).sort()[0];
  const rank: Record<Segment, number> = { done: 0, half: 0, upcoming: 1, missed: 2, waiting: 3 };
  return sessions
    .filter((s) => s.ownerId === ownerId)
    .map((s) => {
      const when = slot(s.id);
      const kind: Segment =
        s.status === "completed" ? "done" : s.status === "in-progress" || s.completedMinutes > 0 ? "half" : when === undefined ? "waiting" : when.slice(0, 10) < today ? "missed" : "upcoming";
      return { kind, key: when ?? "~", seq: s.sequence };
    })
    .sort((a, b) => rank[a.kind] - rank[b.kind] || a.key.localeCompare(b.key) || a.seq - b.seq)
    .map((x) => x.kind);
}
