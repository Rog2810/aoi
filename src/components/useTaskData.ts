"use client";
import { useMemo, useState } from "react";
import { getRepositories } from "@/db/db";
import type { Session, Task, TaskStatus } from "@/domain/types";
import { sampleData } from "@/fixtures/sample";
import { allSubtasksDone, taskCompletion, withStatus } from "@/lib/tasks";
import { toDateKey } from "@/lib/dates";
import { usePersistentRecords, type StorageStatus } from "./usePersistentRecords";

/** Loads tasks, sessions and completion records, and changes task status the same way everywhere. */
export function useTaskData(now: Date) {
  const repos = getRepositories();
  const seed = useMemo(() => sampleData(now), [now]);
  const t = usePersistentRecords(repos.tasks, () => seed.tasks);
  const s = usePersistentRecords(repos.sessions, () => seed.sessions);
  const c = usePersistentRecords(repos.completions, () => []);
  const [parentPrompt, setParentPrompt] = useState<Task | null>(null);

  const states = [t.status, s.status, c.status];
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

  return { status, tasks: t.items, sessions: s.items, completions: c.items, setStatus, addTask, saveSession: s.save, parentPrompt, answerParent };
}
