import { describe, expect, it } from "vitest";
import type { Session, TimeboxEntry } from "../src/domain/types";
import { dayEndsAt, missedRecord, recentlyActive, sessionsToRelease } from "../src/lib/missed";

const stamp = "2026-11-20T08:00:00.000Z";
const session = (id: string, extra: Partial<Session> = {}): Session => ({ id, ownerType: "task", ownerId: "t1", sequence: 1, plannedMinutes: 45, completedMinutes: 0, status: "scheduled", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const slot = (sourceId: string, date: string, start = 1380): TimeboxEntry => ({ id: `b-${sourceId}-${date}`, date, startMinute: start, endMinute: start + 45, sourceType: "session", sourceId, manual: true, createdAt: stamp, updatedAt: stamp });

describe("dayEndsAt", () => {
  it("is the cutoff hour on the following day, in local time", () => {
    expect(dayEndsAt("2026-11-25")).toEqual(new Date(2026, 10, 26, 4, 0));
    expect(dayEndsAt("2026-11-30", 3)).toEqual(new Date(2026, 11, 1, 3, 0));
  });
});

describe("sessionsToRelease", () => {
  const entries = [slot("a", "2026-11-25")];
  it("waits until the cutoff on the next day, so work past midnight is safe", () => {
    expect(sessionsToRelease([session("a")], entries, new Date(2026, 10, 26, 0, 30))).toEqual([]);
    expect(sessionsToRelease([session("a")], entries, new Date(2026, 10, 26, 3, 59))).toEqual([]);
    expect(sessionsToRelease([session("a")], entries, new Date(2026, 10, 26, 4, 0)).map((r) => r.session.id)).toEqual(["a"]);
  });
  it("only releases sessions that were never started", () => {
    expect(sessionsToRelease([session("a", { status: "in-progress" })], entries, new Date(2026, 10, 27, 12, 0))).toEqual([]);
  });
  it("never releases today's sessions or sessions without a slot", () => {
    expect(sessionsToRelease([session("b")], [slot("b", "2026-11-27")], new Date(2026, 10, 27, 12, 0))).toEqual([]);
    expect(sessionsToRelease([session("c")], [], new Date(2026, 10, 27, 12, 0))).toEqual([]);
  });
  it("uses the latest slot when a session has more than one", () => {
    const two = [slot("a", "2026-11-24"), slot("a", "2026-11-26")];
    expect(sessionsToRelease([session("a")], two, new Date(2026, 10, 27, 5, 0))[0].entry.date).toBe("2026-11-26");
    expect(sessionsToRelease([session("a")], two, new Date(2026, 10, 27, 3, 0))).toEqual([]);
  });
});

describe("recentlyActive", () => {
  const at = new Date(2026, 10, 27, 5, 0);
  const ago = (m: number) => new Date(at.getTime() - m * 60_000).toISOString();
  it("is true for a session active or a completion within the hour", () => {
    expect(recentlyActive([session("a", { lastActiveAt: ago(30) })], [], at)).toBe(true);
    expect(recentlyActive([], [ago(10)], at)).toBe(true);
  });
  it("is false when nothing happened for over an hour", () => {
    expect(recentlyActive([session("a", { lastActiveAt: ago(90) })], [ago(120)], at)).toBe(false);
    expect(recentlyActive([session("a")], [], at)).toBe(false);
  });
});

describe("missedRecord", () => {
  it("records the plan with a stable id and is not shaped like a completion", () => {
    const rec = missedRecord(session("a"), slot("a", "2026-11-25"), new Date(2026, 10, 26, 4, 0));
    expect(rec).toMatchObject({ id: "a@2026-11-25:1380", sessionId: "a", date: "2026-11-25", plannedMinutes: 45 });
    expect("completedAt" in rec).toBe(false);
  });
});
