import { describe, expect, it } from "vitest";
import type { CalendarEvent, TimeboxEntry } from "../src/domain/types";
import { parseTime, placementError } from "../src/lib/timebox";

const stamp = "2026-11-01T00:00:00.000Z";
const event = (extra: Partial<CalendarEvent> = {}): CalendarEvent => ({ id: "e", title: "Lecture", date: "2026-11-23", startMinute: 540, endMinute: 630, recurrence: "never", overlapPolicy: "exclusive", createdAt: stamp, updatedAt: stamp, revision: 1, ...extra });
const entry = (sourceId: string, start: number, end: number): TimeboxEntry => ({ id: sourceId, date: "2026-11-23", startMinute: start, endMinute: end, sourceType: "session", sourceId, manual: true, createdAt: stamp, updatedAt: stamp });
const place = (start: number, end: number) => ({ sessionId: "s1", date: "2026-11-23", startMinute: start, endMinute: end });

describe("parseTime", () => {
  it("reads HH:mm and rejects anything else", () => {
    expect(parseTime("09:05")).toBe(545);
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("9:5")).toBeNull();
  });
});

describe("placementError", () => {
  it("accepts a free slot", () => expect(placementError(place(660, 705), [], [])).toBeNull());
  it("requires five-minute snapping", () => expect(placementError(place(662, 707), [], [])).toMatch(/five minutes/));
  it("keeps sessions inside one day", () => expect(placementError(place(1420, 1465), [], [])).toMatch(/one day/));
  it("blocks overlap with an exclusive event but allows touching edges", () => {
    expect(placementError(place(600, 645), [], [event()])).toMatch(/Lecture/);
    expect(placementError(place(630, 675), [], [event()])).toBeNull();
  });
  it("allows overlap with an allows-parallel-work event", () => {
    expect(placementError(place(600, 645), [], [event({ overlapPolicy: "allows-parallel-work" })])).toBeNull();
  });
  it("blocks overlap with another entry but ignores the session's own", () => {
    expect(placementError(place(600, 645), [entry("s2", 620, 665)], [])).toMatch(/another/);
    expect(placementError(place(600, 645), [entry("s1", 620, 665)], [])).toBeNull();
  });
});
