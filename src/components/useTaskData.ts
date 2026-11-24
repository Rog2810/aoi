"use client";
import { useMemo, useState } from "react";
import { getRepositories } from "@/db/db";
import type { Project, Session, Task, TaskStatus, TimeboxEntry } from "@/domain/types";
import { sampleData } from "@/fixtures/sample";
import { toDateKey } from "@/lib/dates";
import { newSession } from "@/lib/sessions";
import { allSubtasksDone, taskCompletion, withMoreEstimate, withStatus } from "@/lib/tasks";
import { useSessionLifecycle } from "./useSessionLifecycle";
import { usePersistentRecords, type StorageStatus } from "./usePersistentRecords";

/** Loads tasks, projects, sessions, timebox entries and completion records, and changes them the same way everywhere. */
export function useTaskData(now: Date) {
  const repos = getRepositories();
  const seed = useMemo(() => sampleData(now), [now]);
  const t = usePersistentRecords(repos.tasks, () => seed.tasks);
  const p = usePersistentRecords(repos.projects, () => seed.projects);
  const s = usePersistentRecords(repos.sessions, () => seed.sessions);
  const c = usePersistentRecords(repos.completions, () => []);
  const tb = usePersistentRecords(repos.timebox, () => seed.timebox);
  const [parentPrompt, setParentPrompt] = useState<Task | null>(null);

  const states = [t.status, p.status, s.status, c.status, tb.status];
  const status: StorageStatus = states.includes("loading") ? "loading" : states.includes("error") ? "error" : "ready";
  useSessionLifecycle({ ready: status === "ready", sessions: s.items, timebox: tb.items, saveSession: s.save, saveCompletion: c.save });

  const setStatus = (task: Task, next: TaskStatus) => {
    const at = new Date();
    void t.save(withStatus(task, next, at));
    if (next === "completed") {
      void c.save(taskCompletion(task.id, at));
      const parent = t.items.find((x) => x.id === task.parentId);
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
  const addProject = (project: Project) => void p.save(project);

  /** Creates an on-demand session for a task; the task's estimate grows by the session length so the plan stays honest. */
  const createSession = (taskId: string, minutes: number) => {
    const at = new Date();
    void s.save(newSession("task", taskId, s.items, minutes, at));
    const task = t.items.find((x) => x.id === taskId);
    if (task) void t.save(withMoreEstimate(task, minutes, at));
  };

  /** Places a session on the timebox. Callers validate with placementError first. */
  const scheduleSession = (entry: TimeboxEntry, session: Session) => {
    void tb.save(entry);
    if (session.status === "unscheduled") void s.save({ ...session, status: "scheduled", updatedAt: new Date().toISOString(), revision: session.revision + 1 });
  };

  /** Removes a session's slot. A project session exists only while scheduled, so it is deleted; a task session goes back to waiting. */
  const unscheduleSession = (session: Session) => {
    tb.items.filter((e) => e.sourceType === "session" && e.sourceId === session.id).forEach((e) => void tb.remove(e.id));
    if (session.ownerType === "project") void s.remove(session.id);
    else if (session.status === "scheduled") void s.save({ ...session, status: "unscheduled", updatedAt: new Date().toISOString(), revision: session.revision + 1 });
  };

  /** Undo for a session completed today: removes today's completion record and reopens the session. The timebox will call this. */
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
    projects: p.items,
    sessions: s.items,
    completions: c.items,
    timebox: tb.items,
    events: seed.events, // sample data until the Events page persists them
    setStatus,
    addTask,
    addProject,
    createSession,
    saveSession: s.save,
    scheduleSession,
    unscheduleSession,
    undoSession,
    parentPrompt,
    answerParent,
  };
}
