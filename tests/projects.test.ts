import { describe, expect, it } from "vitest";
import type { Session, Task } from "../src/domain/types";
import { buildProject, validateNewProject } from "../src/lib/projects";
import { newSession } from "../src/lib/sessions";
import { withMoreEstimate } from "../src/lib/tasks";

const stamp = "2026-11-01T00:00:00.000Z";
const AT = new Date(2026, 10, 23);
const existing = (ownerId: string, sequence: number): Session => ({ id: `${ownerId}:s${sequence}`, ownerType: "task", ownerId, sequence, plannedMinutes: 30, completedMinutes: 0, status: "unscheduled", createdAt: stamp, updatedAt: stamp, revision: 1 });
const task: Task = { id: "t1", title: "t1", dueDate: "2026-11-30", estimateMinutes: 90, categoryIds: [], tagIds: [], status: "not-started", createdAt: stamp, updatedAt: stamp, revision: 1 };

describe("validateNewProject / buildProject", () => {
  it("requires a title and limits categories and tags", () => {
    expect(validateNewProject({ title: "Aoi", categoryIds: [], tagIds: [] })).toEqual({});
    expect(Object.keys(validateNewProject({ title: " ", categoryIds: ["a", "b", "c"], tagIds: ["a", "b", "c", "d"] })).sort()).toEqual(["categories", "tags", "title"]);
  });
  it("builds an active project with no due date", () => {
    const p = buildProject({ title: " Aoi ", categoryIds: [], tagIds: [] }, AT);
    expect(p).toMatchObject({ title: "Aoi", status: "active", revision: 1 });
    expect("dueDate" in p).toBe(false);
  });
});

describe("newSession", () => {
  it("continues the owner's numbering and ignores other owners", () => {
    const made = newSession("task", "t1", [existing("t1", 1), existing("t1", 3), existing("t2", 9)], 45, AT);
    expect(made).toMatchObject({ id: "t1:s4", sequence: 4, plannedMinutes: 45, status: "unscheduled", ownerType: "task" });
  });
  it("starts at 1 for an owner with no sessions", () => {
    expect(newSession("project", "p1", [], 30, AT).sequence).toBe(1);
  });
});

describe("withMoreEstimate", () => {
  it("adds the session length and bumps the revision", () => {
    expect(withMoreEstimate(task, 45, AT)).toMatchObject({ estimateMinutes: 135, revision: 2 });
  });
});
