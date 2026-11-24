import { describe, expect, it } from "vitest";
import type { CompletionRecord, Session, TimeboxEntry } from "../src/domain/types";
import { sessionNumbers, settledCount } from "../src/lib/sessionNumbers";

const stamp = "2026-11-01T00:00:00.000Z";
const session = (id: string, sequence: number, extra: Partial<Session> = {}): Session => ({ id, ownerType: "task", ownerId: "t1", sequence, plannedMinutes: 45, completedMinutes: 0, status: "unscheduled", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const slot = (sourceId: string, date: string, start: number): TimeboxEntry => ({ id: `b-${sourceId}`, date, startMinute: start, endMinute: start + 45, sourceType: "session", sourceId, manual: true, createdAt: stamp, updatedAt: stamp });
const done = (sourceId: string, completedAt: string, localDate: string): CompletionRecord => ({ id: `c-${sourceId}`, sourceId, sourceType: "session", completedAt, localDate, retroactive: false, createdAt: stamp });

describe("sessionNumbers", () => {
  it("numbers placed sessions by time, not by creation order", () => {
    const m = sessionNumbers([session("s1", 1), session("s2", 2)], [slot("s1", "2026-11-24", 540), slot("s2", "2026-11-23", 540)], []);
    expect([m.get("s1"), m.get("s2")]).toEqual([2, 1]);
  });
  it("numbers waiting sessions after the placed ones, in creation order", () => {
    const m = sessionNumbers([session("s1", 1), session("s2", 2), session("s3", 3)], [slot("s1", "2026-11-24", 540)], []);
    expect([m.get("s1"), m.get("s2"), m.get("s3")]).toEqual([1, 2, 3]);
  });
  it("renumbers everything when a waiting session is scheduled before the others", () => {
    const sessions = [session("s1", 1), session("s2", 2), session("s3", 3)];
    const m = sessionNumbers(sessions, [slot("s1", "2026-11-24", 540), slot("s3", "2026-11-23", 540)], []);
    expect([m.get("s3"), m.get("s1"), m.get("s2")]).toEqual([1, 2, 3]);
  });
  it("lowers the top waiting number by one when a session is unscheduled", () => {
    const sessions = [session("s1", 1), session("s2", 2), session("s3", 3)];
    const both = [slot("s1", "2026-11-24", 540), slot("s2", "2026-11-25", 540)];
    expect(sessionNumbers(sessions, both, []).get("s3")).toBe(3);
    expect(sessionNumbers(sessions, [both[0]], []).get("s2")).toBe(2);
  });
  it("ranks a session finished without a slot by when it was completed", () => {
    const sessions = [session("s1", 1), session("s2", 2, { status: "completed" })];
    const completions = [done("s2", new Date(2026, 10, 23, 10, 0).toISOString(), "2026-11-23")];
    const m = sessionNumbers(sessions, [slot("s1", "2026-11-24", 540)], completions);
    expect([m.get("s2"), m.get("s1")]).toEqual([1, 2]);
  });
  it("numbers each owner separately", () => {
    const m = sessionNumbers([session("a1", 1, { ownerId: "a" }), session("b1", 1, { ownerId: "b" })], [], []);
    expect([m.get("a1"), m.get("b1")]).toEqual([1, 1]);
  });
});

describe("settledCount", () => {
  it("counts placed and finished sessions, not waiting ones", () => {
    const sessions = [session("s1", 1), session("s2", 2, { status: "completed" }), session("s3", 3)];
    const completions = [done("s2", new Date(2026, 10, 23, 10, 0).toISOString(), "2026-11-23")];
    expect(settledCount("t1", sessions, [slot("s1", "2026-11-24", 540)], completions)).toBe(2);
  });
});
