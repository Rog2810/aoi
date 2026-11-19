import type { Task } from "../domain/types";

const T0 = "2026-11-01T09:00:00.000Z";
const t = (id: string, title: string, dueDate: string, estimateMinutes: number, extra: Partial<Task> = {}): Task => ({
  id, title, dueDate, estimateMinutes, categoryIds: [], tagIds: [], status: "not-started", createdAt: T0, updatedAt: T0, revision: 1, ...extra,
});

/** Deterministic sample data only; no personal information. */
export const SAMPLE_TASKS: Task[] = [
  t("t1", "Chemistry lab report", "2026-11-20", 180, { preferredSessionMinutes: 45, status: "in-progress" }),
  t("t2", "Draft methods section", "2026-11-17", 60, { parentId: "t1" }),
  t("t3", "Reply to advisor email", "2026-11-13", 15),
  t("t4", "Read chapter 6", "2026-11-10", 90),
  t("t5", "Final project outline", "2026-12-04", 120),
];
