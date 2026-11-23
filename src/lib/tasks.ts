import type { CompletionRecord, Session, Task, TaskStatus } from "../domain/types";
import { toDateKey } from "./dates";
import { generateSessions } from "./sessions";

/** Limits live here, not in the database schema, so they can change later. */
export const MAX_CATEGORIES = 2;
export const MAX_TAGS = 3;

export type Column = "not-started" | "in-progress" | "completed-today";

/** A copy with the new status; revision and timestamp change so sync can later see the edit. */
export const withStatus = (t: Task, status: TaskStatus, at: Date): Task => ({ ...t, status, updatedAt: at.toISOString(), revision: t.revision + 1 });

export const taskCompletion = (taskId: string, at: Date): CompletionRecord => ({
  id: crypto.randomUUID(),
  sourceId: taskId,
  sourceType: "task",
  completedAt: at.toISOString(),
  localDate: toDateKey(at),
  retroactive: false,
  createdAt: at.toISOString(),
});

/** Which board column a task belongs in, or null when it is not on the board (cancelled, or completed on an earlier day). */
export function columnFor(t: Task, completions: CompletionRecord[], today: string): Column | null {
  if (t.status === "not-started" || t.status === "in-progress") return t.status;
  if (t.status === "completed" && completions.some((c) => c.sourceType === "task" && c.sourceId === t.id && c.localDate === today)) return "completed-today";
  return null;
}

/** True when the task has subtasks and all of them are completed. */
export function allSubtasksDone(parent: Task, tasks: Task[]): boolean {
  const subs = tasks.filter((t) => t.parentId === parent.id && t.status !== "cancelled");
  return subs.length > 0 && subs.every((t) => t.status === "completed");
}

export const sortByDue = (a: Task, b: Task): number =>
  a.dueDate.localeCompare(b.dueDate) || (a.dueTime ?? "24:00").localeCompare(b.dueTime ?? "24:00") || a.title.localeCompare(b.title);

export function sessionProgress(sessions: Session[], taskId: string) {
  const own = sessions.filter((s) => s.ownerId === taskId);
  return { total: own.length, done: own.filter((s) => s.status === "completed").length };
}

export interface NewTaskInput {
  title: string;
  dueDate: string;
  dueTime: string;
  estimate: string;
  preferred: string;
  categoryIds: string[];
  tagIds: string[];
  projectId?: string;
}

/** Field name -> message. An empty object means the input is valid. */
export function validateNewTask(i: NewTaskInput): Record<string, string> {
  const e: Record<string, string> = {};
  const whole = (v: string) => Number.isInteger(Number(v)) && Number(v) >= 1;
  if (!i.title.trim()) e.title = "Enter a title.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.dueDate)) e.dueDate = "Choose a due date.";
  if (!whole(i.estimate)) e.estimate = "Enter whole minutes, 1 or more.";
  if (i.preferred !== "" && !whole(i.preferred)) e.preferred = "Enter whole minutes, 1 or more, or leave it blank.";
  if (i.categoryIds.length > MAX_CATEGORIES) e.categories = `Choose at most ${MAX_CATEGORIES} categories.`;
  if (i.tagIds.length > MAX_TAGS) e.tags = `Choose at most ${MAX_TAGS} tags.`;
  return e;
}

/** Builds the task and its logical sessions (no scheduling; that is the future scheduler's job). */
export function buildTask(i: NewTaskInput, parentId: string | undefined, at: Date): { task: Task; sessions: Session[] } {
  const id = crypto.randomUUID();
  const now = at.toISOString();
  const task: Task = {
    id,
    title: i.title.trim(),
    dueDate: i.dueDate,
    dueTime: i.dueTime || undefined,
    estimateMinutes: Number(i.estimate),
    preferredSessionMinutes: i.preferred ? Number(i.preferred) : undefined,
    categoryIds: i.categoryIds,
    tagIds: i.tagIds,
    status: "not-started",
    parentId,
    projectId: i.projectId || undefined,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
  return { task, sessions: generateSessions(id, task.estimateMinutes, task.preferredSessionMinutes, now) };
}

/** A copy with a longer estimate (used when a session is added to a task). */
export const withMoreEstimate = (t: Task, minutes: number, at: Date): Task => ({ ...t, estimateMinutes: t.estimateMinutes + minutes, updatedAt: at.toISOString(), revision: t.revision + 1 });
