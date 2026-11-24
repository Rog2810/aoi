import { describe, expect, it } from "vitest";
import type { Session } from "../src/domain/types";
import { idleMinutes, sessionCompletion, spentOn, splitSession } from "../src/lib/sessions";

const stamp = "2026-11-24T08:00:00.000Z";
const AT = new Date(2026, 10, 24, 12, 0);
const session = (extra: Partial<Session> = {}): Session => ({ id: "t1:s1", ownerType: "task", ownerId: "t1", sequence: 1, plannedMinutes: 45, completedMinutes: 20, status: "in-progress", createdAt: stamp, updatedAt: stamp, revision: 3, ...extra });

describe("splitSession", () => {
  it("completes the worked part and leaves the rest as a new waiting session", () => {
    const { done, leftover } = splitSession(session(), 20, [session()], AT);
    expect(done).toMatchObject({ id: "t1:s1", status: "completed", plannedMinutes: 20, completedMinutes: 20, revision: 4 });
    expect(leftover).toMatchObject({ ownerId: "t1", plannedMinutes: 25, status: "unscheduled", sequence: 2 });
    expect(done.plannedMinutes + (leftover?.plannedMinutes ?? 0)).toBe(45);
  });
  it("makes no leftover when under five minutes remain", () => {
    expect(splitSession(session(), 42, [], AT).leftover).toBeUndefined();
  });
  it("makes no leftover for a project session", () => {
    expect(splitSession(session({ ownerType: "project", plannedMinutes: 60 }), 20, [], AT).leftover).toBeUndefined();
  });
});

describe("idleMinutes", () => {
  it("measures from the last activity, falling back to the last update", () => {
    const ago = (m: number) => new Date(AT.getTime() - m * 60_000).toISOString();
    expect(idleMinutes(session({ lastActiveAt: ago(90) }), AT)).toBe(90);
    expect(idleMinutes(session({ updatedAt: ago(30) }), AT)).toBe(30);
  });
  it("is null for a session that is not started", () => {
    expect(idleMinutes(session({ status: "scheduled" }), AT)).toBeNull();
  });
});

describe("sessionCompletion / spentOn", () => {
  it("records the real minutes with a timestamp and local date", () => {
    expect(sessionCompletion("t1:s1", 20, AT)).toMatchObject({ sourceId: "t1:s1", sourceType: "session", minutesSpent: 20, localDate: "2026-11-24" });
  });
  it("adds up logged minutes for one owner", () => {
    expect(spentOn("t1", [session({ completedMinutes: 20 }), session({ id: "t1:s2", completedMinutes: 30 }), session({ id: "x:s1", ownerId: "x", completedMinutes: 99 })])).toBe(50);
  });
});
