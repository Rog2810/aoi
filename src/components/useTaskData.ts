"use client";
import { useMemo, useState } from "react";
import { getRepositories } from "@/db/db";
import type { Session, Task, TaskStatus, TimeboxEntry } from "@/domain/types";
import { sampleData } from "@/fixtures/sample";
import { toDateKey } from "@/lib/dates";
import { allSubtasksDone, taskCompletion, withStatus } from "@/lib/tasks";
import { usePersistentRecords, type StorageStatus } from "./usePersistentRecords";

/** Loads tasks, sessions, timebox entries and completion records, and changes them the same way everywhere. */
export function useTaskData(now: Date) {
  const repos = getRepositories();
  const seed = useMemo(() => sampleData(now), [now]);
  const t = usePersistentRecords(repos.tasks, () => seed.tasks);
  const s = usePersistentRecords(repos.sessions, () => seed.sessions);
  const c = usePersistentRecords(repos.completions, () => []);
  const tb = usePersistentRecords(repos.timebox, () => seed.timebox);
  const [parentPrompt, setParentPrompt] = useState<Task | null>(null);

  const states = [t.status, s.status, c.status, tb.status];
  const status: StorageStatus = states.includes("loading") ? "loading" : states.includes("error") ? "error" : "ready";

  const setStatus = (task: Task, next: TaskStatus) => {
    const at = new Date();
    void t.save(withStatus(task, next, at));
    if (next === "completed") {
      void c.save(taskCompletion(task.id, at));
      const parent = t.items.find((p) => p.id === task.parentId);
      if (parent && parent.status !== "completed") {
        const after = t.items.map((x) => (x.id === task.id ? { ...x, status: next } : x));
        if (allSubtasksDone(parent, after)) setParentPrompt(parent); // the user decides: there may be unlisted work left
      }
    } else if (task.status === "completed") {
      // Undo: today's completion no longer counts. Earlier days' records stay as history.
      c.items.filter((r) => r.sourceType === "task" && r.sourceId === task.id && r.localDate === toDateKey(at)).forEach((r) => void c.remove(r.id));
    }
  };
  const answerParent = (complete: boolean) => {
    if (complete && parentPrompt) setStatus(parentPrompt, "completed");
    setParentPrompt(null);
  };
  const addTask = (task: Task, sessions: Session[]) => {
    void t.save(task);
    sessions.forEach((x) => void s.save(x));
  };

  /** Places a session on the timebox. Callers validate with placementError first. */
  const scheduleSession = (entry: TimeboxEntry, session: Session) => {
    void tb.save(entry);
    if (session.status === "unscheduled") void s.save({ ...session, status: "scheduled", updatedAt: new Date().toISOString(), revision: session.revision + 1 });
  };
  /** Undo for a session completed today: removes today's completion record and reopens the session. */
  const undoSession = (session: Session) => {
    const at = new Date();
    c.items.filter((r) => r.sourceType === "session" && r.sourceId === session.id && r.localDate === toDateKey(at)).forEach((r) => void c.remove(r.id));
    const placed = tb.items.some((e) => e.sourceType === "session" && e.sourceId === session.id);
    const reopened = session.completedMinutes > 0 ? "in-progress" : placed ? "scheduled" : "unscheduled";
    void s.save({ ...session, status: reopened, updatedAt: at.toISOString(), revision: session.revision + 1 });
  };

  return {
    status,
    tasks: t.items,
    sessions: s.items,
    completions: c.items,
    timebox: tb.items,
    events: seed.events, // sample data until the Events page persists them
    setStatus,
    addTask,
    saveSession: s.save,
    scheduleSession,
    undoSession,
    parentPrompt,
    answerParent,
  };
}
