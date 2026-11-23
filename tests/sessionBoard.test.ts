import { describe, expect, it } from "vitest";
import type { CompletionRecord, Session, Task, TimeboxEntry } from "../src/domain/types";
import { groupSessions, sessionColumn } from "../src/lib/sessionBoard";

const stamp = "2026-11-01T00:00:00.000Z";
const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: id, dueDate: "2026-11-30", estimateMinutes: 90, categoryIds: [], tagIds: [], status: "not-started", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const session = (id: string, taskId: string, sequence: number, extra: Partial<Session> = {}): Session => ({ id, taskId, sequence, plannedMinutes: 45, completedMinutes: 0, status: "unscheduled", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const slot = (sourceId: string, date: string, start: number): TimeboxEntry => ({ id: `b-${sourceId}`, date, startMinute: start, endMinute: start + 45, sourceType: "session", sourceId, manual: true, createdAt: stamp, updatedAt: stamp });
const done = (sourceId: string, localDate: string): CompletionRecord => ({ id: `c-${sourceId}-${localDate}`, sourceId, sourceType: "session", completedAt: stamp, localDate, retroactive: false, createdAt: stamp });
const TODAY = "2026-11-23";

describe("sessionColumn", () => {
  const t = task("t1");
  it("splits open sessions by whether they have a slot", () => {
    expect(sessionColumn(session("s1", "t1", 1), t, [], [], TODAY)).toBe("unscheduled");
    expect(sessionColumn(session("s1", "t1", 1), t, [slot("s1", TODAY, 540)], [], TODAY)).toBe("scheduled");
  });
  it("shows sessions completed today and hides earlier ones", () => {
    const s = session("s1", "t1", 1, { status: "completed" });
    expect(sessionColumn(s, t, [], [done("s1", TODAY)], TODAY)).toBe("completed-today");
    expect(sessionColumn(s, t, [], [done("s1", "2026-11-22")], TODAY)).toBeNull();
  });
  it("hides sessions of cancelled tasks and open sessions of completed tasks", () => {
    expect(sessionColumn(session("s1", "t1", 1), task("t1", { status: "cancelled" }), [], [], TODAY)).toBeNull();
    expect(sessionColumn(session("s1", "t1", 1), task("t1", { status: "completed" }), [], [], TODAY)).toBeNull();
  });
});

describe("groupSessions", () => {
  it("makes one group per task per column, sorted by due date", () => {
    const tasks = [task("late", { dueDate: "2026-12-10" }), task("soon", { dueDate: "2026-11-25" })];
    const sessions = [session("a1", "late", 1), session("a2", "late", 2), session("b1", "soon", 1)];
    const groups = groupSessions(tasks, sessions, [], [], TODAY).unscheduled;
    expect(groups.map((g) => g.task.id)).toEqual(["soon", "late"]);
    expect(groups[1].sessions.map((s) => s.id)).toEqual(["a1", "a2"]);
  });
  it("orders a scheduled group by slot, so the next session is on top", () => {
    const sessions = [session("s1", "t1", 1), session("s2", "t1", 2), session("s3", "t1", 3)];
    const entries = [slot("s1", "2026-11-24", 540), slot("s2", TODAY, 1020), slot("s3", TODAY, 660)];
    expect(groupSessions([task("t1")], sessions, entries, [], TODAY).scheduled[0].sessions.map((s) => s.id)).toEqual(["s3", "s2", "s1"]);
  });
});
