import { describe, expect, it } from "vitest";
import type { Project, Session, Task, TimeboxEntry } from "../src/domain/types";
import { groupSessions, segmentsFor } from "../src/lib/sessionBoard";

const stamp = "2026-11-01T00:00:00.000Z";
const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: id, dueDate: "2026-11-30", estimateMinutes: 90, categoryIds: [], tagIds: [], status: "not-started", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const project = (id: string, extra: Partial<Project> = {}): Project => ({ id, title: id, categoryIds: [], tagIds: [], status: "active", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const session = (id: string, ownerId: string, sequence: number, extra: Partial<Session> = {}): Session => ({ id, ownerType: "task", ownerId, sequence, plannedMinutes: 45, completedMinutes: 0, status: "unscheduled", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const slot = (sourceId: string, date: string, start: number): TimeboxEntry => ({ id: `b-${sourceId}`, date, startMinute: start, endMinute: start + 45, sourceType: "session", sourceId, manual: true, createdAt: stamp, updatedAt: stamp });
const ids = (g: { sessions: Session[] }) => g.sessions.map((s) => s.id);

describe("groupSessions", () => {
  it("splits open task sessions by whether they have a slot", () => {
    const g = groupSessions([task("t1")], [], [session("s1", "t1", 1), session("s2", "t1", 2)], [slot("s2", "2026-11-23", 540)]);
    expect(ids(g.unscheduled[0])).toEqual(["s1"]);
    expect(ids(g.scheduled[0])).toEqual(["s2"]);
  });
  it("makes one group per task per column, sorted by due date", () => {
    const tasks = [task("late", { dueDate: "2026-12-10" }), task("soon", { dueDate: "2026-11-25" })];
    const g = groupSessions(tasks, [], [session("a1", "late", 1), session("a2", "late", 2), session("b1", "soon", 1)], []).unscheduled;
    expect(g.map((x) => (x.kind === "task" ? x.task.id : ""))).toEqual(["soon", "late"]);
    expect(ids(g[1])).toEqual(["a1", "a2"]);
  });
  it("orders a scheduled group by slot so the next session is on top", () => {
    const sessions = [session("s1", "t1", 1), session("s2", "t1", 2), session("s3", "t1", 3)];
    const entries = [slot("s1", "2026-11-24", 540), slot("s2", "2026-11-23", 1020), slot("s3", "2026-11-23", 660)];
    expect(ids(groupSessions([task("t1")], [], sessions, entries).scheduled[0])).toEqual(["s3", "s2", "s1"]);
  });
  it("lists every active project under Projects; the board adds each project's next card itself", () => {
    const g = groupSessions([], [project("p1"), project("p2")], [session("p1:s1", "p1", 1, { ownerType: "project" })], []);
    expect(g.projects.map((x) => x.sessions.length)).toEqual([0, 0]);
    expect(g.scheduled).toEqual([]);
  });
  it("shows a placed project session under Scheduled with the project name", () => {
    const sessions = [session("p1:s1", "p1", 1, { ownerType: "project" }), session("p1:s2", "p1", 2, { ownerType: "project" })];
    const g = groupSessions([], [project("p1")], sessions, [slot("p1:s2", "2026-11-23", 540)]);
    expect(g.scheduled[0]).toMatchObject({ kind: "project" });
    expect(ids(g.scheduled[0])).toEqual(["p1:s2"]);
    expect(g.projects[0].sessions).toEqual([]);
  });
  it("hides completed sessions, closed tasks and archived projects", () => {
    const sessions = [session("a", "t1", 1, { status: "completed" }), session("b", "t2", 1), session("c", "t3", 1), session("d", "p1", 1, { ownerType: "project" })];
    const tasks = [task("t1"), task("t2", { status: "cancelled" }), task("t3", { status: "completed" })];
    const g = groupSessions(tasks, [project("p1", { status: "archived" })], sessions, []);
    expect([g.unscheduled, g.scheduled, g.projects].map((x) => x.length)).toEqual([0, 0, 0]);
  });
});

describe("segmentsFor", () => {
  const TODAY = "2026-11-26";
  it("orders done and started first, then upcoming, then missed, then waiting", () => {
    const sessions = [
      session("w", "t1", 5),
      session("m", "t1", 2, { status: "scheduled" }),
      session("u", "t1", 3, { status: "scheduled" }),
      session("d", "t1", 1, { status: "completed" }),
      session("h", "t1", 4, { status: "in-progress" }),
    ];
    const entries = [slot("m", "2026-11-25", 540), slot("u", "2026-11-27", 540), slot("d", "2026-11-24", 540), slot("h", "2026-11-26", 540)];
    expect(segmentsFor(sessions, "t1", entries, TODAY)).toEqual(["done", "half", "upcoming", "missed", "waiting"]);
  });
  it("no longer leaves a hole between done sessions when a middle one was missed", () => {
    const sessions = [session("a", "t1", 1, { status: "completed" }), session("b", "t1", 2), session("c", "t1", 3, { status: "completed" })];
    const entries = [slot("a", "2026-11-24", 540), slot("c", "2026-11-25", 540)];
    expect(segmentsFor(sessions, "t1", entries, TODAY)).toEqual(["done", "done", "waiting"]);
  });
});
