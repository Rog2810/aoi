import { describe, expect, it } from "vitest";
import type { CompletionRecord, Task } from "../src/domain/types";
import { allSubtasksDone, buildTask, columnFor, validateNewTask, type NewTaskInput } from "../src/lib/tasks";

const stamp = "2026-11-01T00:00:00.000Z";
const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: id, dueDate: "2026-11-30", estimateMinutes: 60, categoryIds: [], tagIds: [], status: "not-started", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const done = (sourceId: string, localDate: string): CompletionRecord => ({ id: `${sourceId}-${localDate}`, sourceId, sourceType: "task", completedAt: stamp, localDate, retroactive: false, createdAt: stamp });
const input = (extra: Partial<NewTaskInput> = {}): NewTaskInput => ({ title: "Essay", dueDate: "2026-12-01", dueTime: "", estimate: "60", preferred: "", categoryIds: [], tagIds: [], ...extra });

describe("columnFor", () => {
  it("keeps open tasks in their own columns", () => {
    expect(columnFor(task("a"), [], "2026-11-22")).toBe("not-started");
    expect(columnFor(task("a", { status: "in-progress" }), [], "2026-11-22")).toBe("in-progress");
  });
  it("shows a task completed today and hides one completed earlier", () => {
    const t = task("a", { status: "completed" });
    expect(columnFor(t, [done("a", "2026-11-22")], "2026-11-22")).toBe("completed-today");
    expect(columnFor(t, [done("a", "2026-11-21")], "2026-11-22")).toBeNull();
  });
  it("hides cancelled tasks", () => {
    expect(columnFor(task("a", { status: "cancelled" }), [], "2026-11-22")).toBeNull();
  });
});

describe("allSubtasksDone", () => {
  const parent = task("p");
  it("needs at least one subtask and all completed", () => {
    expect(allSubtasksDone(parent, [parent])).toBe(false);
    expect(allSubtasksDone(parent, [parent, task("s1", { parentId: "p", status: "completed" }), task("s2", { parentId: "p" })])).toBe(false);
    expect(allSubtasksDone(parent, [parent, task("s1", { parentId: "p", status: "completed" })])).toBe(true);
  });
});

describe("validateNewTask", () => {
  it("accepts a valid task", () => expect(validateNewTask(input())).toEqual({}));
  it("flags a missing title, bad minutes and too many categories or tags", () => {
    const e = validateNewTask(input({ title: " ", estimate: "0", categoryIds: ["a", "b", "c"], tagIds: ["a", "b", "c", "d"] }));
    expect(Object.keys(e).sort()).toEqual(["categories", "estimate", "tags", "title"]);
  });
});

describe("buildTask", () => {
  it("creates the task and its logical sessions", () => {
    const { task: t, sessions } = buildTask(input({ estimate: "180", preferred: "45" }), undefined, new Date(2026, 10, 22));
    expect(sessions).toHaveLength(4);
    expect(sessions.every((s) => s.taskId === t.id)).toBe(true);
  });
});
