import type { CompletionRecord, Session, Task, TimeboxEntry } from "../domain/types";
import { sortByDue } from "./tasks";

export type SessionColumn = "unscheduled" | "scheduled" | "completed-today";
export interface SessionGroup { task: Task; sessions: Session[] }

/** Which column a session belongs in, or null when it is not on the board. */
export function sessionColumn(s: Session, task: Task | undefined, entries: TimeboxEntry[], completions: CompletionRecord[], today: string): SessionColumn | null {
  if (!task || task.status === "cancelled") return null;
  if (s.status === "completed") {
    return completions.some((c) => c.sourceType === "session" && c.sourceId === s.id && c.localDate === today) ? "completed-today" : null;
  }
  if (task.status === "completed") return null;
  return entries.some((e) => e.sourceType === "session" && e.sourceId === s.id) ? "scheduled" : "unscheduled";
}

/** One group per task per column. Groups are sorted by the task's due date, sessions in the order they should be done. */
export function groupSessions(tasks: Task[], sessions: Session[], entries: TimeboxEntry[], completions: CompletionRecord[], today: string): Record<SessionColumn, SessionGroup[]> {
  const maps: Record<SessionColumn, Map<string, SessionGroup>> = { unscheduled: new Map(), scheduled: new Map(), "completed-today": new Map() };
  for (const s of sessions) {
    const task = tasks.find((t) => t.id === s.taskId);
    const col = sessionColumn(s, task, entries, completions, today);
    if (!col || !task) continue;
    const group = maps[col].get(task.id) ?? { task, sessions: [] };
    group.sessions.push(s);
    maps[col].set(task.id, group);
  }
  const slotKey = (id: string) =>
    entries.filter((e) => e.sourceType === "session" && e.sourceId === id).map((e) => `${e.date} ${String(e.startMinute).padStart(4, "0")}`).sort()[0] ?? "~";
  const result = {} as Record<SessionColumn, SessionGroup[]>;
  for (const col of Object.keys(maps) as SessionColumn[]) {
    result[col] = [...maps[col].values()]
      .map((g) => ({ ...g, sessions: [...g.sessions].sort((a, b) => (col === "scheduled" ? slotKey(a.id).localeCompare(slotKey(b.id)) : a.sequence - b.sequence)) }))
      .sort((a, b) => sortByDue(a.task, b.task));
  }
  return result;
}

/** One segment per session of a task, in order, for the progress strip. */
export function segmentsFor(sessions: Session[], taskId: string): ("done" | "half" | "empty")[] {
  return sessions
    .filter((s) => s.taskId === taskId)
    .sort((a, b) => a.sequence - b.sequence)
    .map((s) => (s.status === "completed" ? "done" : s.status === "in-progress" || s.completedMinutes > 0 ? "half" : "empty"));
}
