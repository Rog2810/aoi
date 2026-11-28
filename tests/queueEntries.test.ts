import { describe, expect, it } from "vitest";
import type { Session, TimeboxEntry } from "../src/domain/types";
import { queueEntries } from "../src/lib/queue";

const stamp = "2026-11-20T08:00:00.000Z";
const session = (id: string, extra: Partial<Session> = {}): Session => ({ id, ownerType: "task", ownerId: "t1", sequence: 1, plannedMinutes: 45, completedMinutes: 0, status: "scheduled", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const slot = (sourceId: string, date: string, start = 600): TimeboxEntry => ({ id: `b-${sourceId}`, date, startMinute: start, endMinute: start + 45, sourceType: "session", sourceId, manual: true, createdAt: stamp, updatedAt: stamp });
const ids = (list: TimeboxEntry[]) => list.map((e) => e.sourceId);
const TODAY = "2026-11-26";

describe("queueEntries", () => {
  it("includes today's slots and leaves later days out", () => {
    expect(ids(queueEntries([slot("a", TODAY), slot("b", "2026-11-27")], [session("a"), session("b")], TODAY, new Date(2026, 10, 26, 9, 0)))).toEqual(["a"]);
  });
  it("keeps yesterday's unfinished session until the cutoff, so a late plan can be finished after midnight", () => {
    const entries = [slot("a", "2026-11-25", 1430)];
    expect(queueEntries(entries, [session("a")], TODAY, new Date(2026, 10, 26, 0, 30))).toHaveLength(1);
    expect(queueEntries(entries, [session("a")], TODAY, new Date(2026, 10, 26, 5, 0))).toHaveLength(0);
  });
  it("always keeps a started session, whatever its date", () => {
    expect(queueEntries([slot("a", "2026-11-25")], [session("a", { status: "in-progress" })], TODAY, new Date(2026, 10, 26, 9, 0))).toHaveLength(1);
  });
  it("sorts by date, then start time", () => {
    const entries = [slot("b", TODAY, 540), slot("a", "2026-11-25", 1380), slot("c", TODAY, 480)];
    const sessions = [session("a"), session("b"), session("c")];
    expect(ids(queueEntries(entries, sessions, TODAY, new Date(2026, 10, 26, 0, 10)))).toEqual(["a", "c", "b"]);
  });
});
