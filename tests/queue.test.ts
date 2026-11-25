import { describe, expect, it } from "vitest";
import type { Session } from "../src/domain/types";
import { orderQueue, readQueueState } from "../src/lib/queue";

const stamp = "2026-11-25T08:00:00.000Z";
const item = (id: string, extra: Partial<Session> = {}) => ({
  session: { id, ownerType: "task", ownerId: "t1", sequence: 1, plannedMinutes: 45, completedMinutes: 0, status: "scheduled", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra } as Session,
});
const ids = (list: { session: Session }[]) => list.map((i) => i.session.id);

describe("orderQueue", () => {
  it("puts the most recently worked started session first", () => {
    const a = item("a", { status: "in-progress", lastActiveAt: "2026-11-25T09:00:00.000Z" });
    const b = item("b", { status: "in-progress", lastActiveAt: "2026-11-25T10:00:00.000Z" });
    expect(ids(orderQueue([a, b], []))).toEqual(["b", "a"]);
  });
  it("keeps time order for sessions that are not started and sends skipped ones to the back", () => {
    expect(ids(orderQueue([item("a"), item("b"), item("c")], ["a"]))).toEqual(["b", "c", "a"]);
  });
  it("honours a skip even if the skipped session was started", () => {
    expect(ids(orderQueue([item("a", { status: "in-progress" }), item("b")], ["a"]))).toEqual(["b", "a"]);
  });
  it("puts the pinned session first without repeating it", () => {
    const pinned = item("c");
    expect(ids(orderQueue([item("a"), item("c")], [], pinned))).toEqual(["c", "a"]);
  });
});

describe("readQueueState", () => {
  const saved = JSON.stringify({ date: "2026-11-25", skipped: ["a", 3, "b"], pinnedId: "p" });
  it("reads today's saved queue and drops anything that is not a session id", () => {
    expect(readQueueState(saved, "2026-11-25")).toEqual({ skipped: ["a", "b"], pinnedId: "p" });
  });
  it("ignores another day, garbage and nothing at all", () => {
    expect(readQueueState(saved, "2026-11-26")).toEqual({ skipped: [], pinnedId: null });
    expect(readQueueState("not json", "2026-11-25")).toEqual({ skipped: [], pinnedId: null });
    expect(readQueueState(null, "2026-11-25")).toEqual({ skipped: [], pinnedId: null });
  });
});
