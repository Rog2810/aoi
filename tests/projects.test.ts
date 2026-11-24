import { describe, expect, it } from "vitest";
import type { CompletionRecord, Project, Session, Task, TimeboxEntry } from "../src/domain/types";
import { buildProject, formatDuration, minutesThisWeek, validateNewProject, weekStartKey } from "../src/lib/projects";
import { newSession } from "../src/lib/sessions";
import { withMoreEstimate } from "../src/lib/tasks";

const stamp = "2026-11-01T00:00:00.000Z";
const AT = new Date(2026, 10, 23);
const project = (id: string, extra: Partial<Project> = {}): Project => ({ id, title: id, categoryIds: [], tagIds: [], status: "active", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const session = (ownerId: string, sequence: number, extra: Partial<Session> = {}): Session => ({ id: `${ownerId}:s${sequence}`, ownerType: "project", ownerId, sequence, plannedMinutes: 60, completedMinutes: 0, status: "unscheduled", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const slot = (sourceId: string): TimeboxEntry => ({ id: `b-${sourceId}`, date: "2026-11-24", startMinute: 540, endMinute: 600, sourceType: "session", sourceId, manual: true, createdAt: stamp, updatedAt: stamp });
const done = (sourceId: string, localDate: string, minutesSpent: number): CompletionRecord => ({ id: `${sourceId}-${localDate}`, sourceId, sourceType: "session", completedAt: stamp, localDate, minutesSpent, retroactive: false, createdAt: stamp });
const task: Task = { id: "t1", title: "t1", dueDate: "2026-11-30", estimateMinutes: 90, categoryIds: [], tagIds: [], status: "not-started", createdAt: stamp, updatedAt: stamp, revision: 1 };
const input = (extra: Partial<Parameters<typeof validateNewProject>[0]> = {}) => ({ title: "Aoi", categoryIds: [], tagIds: [], weeklyHours: "", ...extra });

describe("validateNewProject / buildProject", () => {
  it("accepts a project with no target", () => expect(validateNewProject(input())).toEqual({}));
  it("flags a missing title, bad hours and too many categories or tags", () => {
    const e = validateNewProject(input({ title: " ", weeklyHours: "abc", categoryIds: ["a", "b", "c"], tagIds: ["a", "b", "c", "d"] }));
    expect(Object.keys(e).sort()).toEqual(["categories", "tags", "title", "weeklyHours"]);
  });
  it("accepts decimal hours and rejects zero or more than a week", () => {
    expect(validateNewProject(input({ weeklyHours: "2.5" }))).toEqual({});
    expect(validateNewProject(input({ weeklyHours: "0" })).weeklyHours).toBeDefined();
    expect(validateNewProject(input({ weeklyHours: "200" })).weeklyHours).toBeDefined();
  });
  it("converts hours to minutes and leaves the target unset when blank", () => {
    expect(buildProject(input({ weeklyHours: "2.5" }), AT).weeklyTargetMinutes).toBe(150);
    expect(buildProject(input(), AT).weeklyTargetMinutes).toBeUndefined();
  });
});

describe("weekly target helpers", () => {
  it("finds the first day of the week", () => {
    expect(weekStartKey("2026-11-25")).toBe("2026-11-23");
    expect(weekStartKey("2026-11-29")).toBe("2026-11-23");
    expect(weekStartKey("2026-11-25", 0)).toBe("2026-11-22");
  });
  it("adds up real minutes completed this week for one project", () => {
    const sessions = [session("p1", 1), session("p1", 2), session("p1", 3), session("p2", 1)];
    const completions = [done("p1:s1", "2026-11-23", 30), done("p1:s2", "2026-11-29", 60), done("p1:s3", "2026-11-22", 45), done("p2:s1", "2026-11-24", 90)];
    expect(minutesThisWeek("p1", sessions, completions, "2026-11-25")).toBe(90);
  });
  it("formats durations", () => {
    expect([formatDuration(45), formatDuration(240), formatDuration(150)]).toEqual(["45 min", "4 h", "2 h 30 min"]);
  });
});

describe("newSession / withMoreEstimate", () => {
  it("continues the owner's numbering and ignores other owners", () => {
    const made = newSession("task", "t1", [session("t1", 1), session("t1", 3), session("t2", 9)], 45, AT);
    expect(made).toMatchObject({ id: "t1:s4", sequence: 4, plannedMinutes: 45, status: "unscheduled" });
  });
  it("adds the session length to a task's estimate", () => {
    expect(withMoreEstimate(task, 45, AT)).toMatchObject({ estimateMinutes: 135, revision: 2 });
  });
});
