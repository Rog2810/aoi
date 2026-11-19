import { describe, expect, it } from "vitest";
import { generateSessions, remainingMinutes } from "../src/lib/sessions";

const NOW = "2026-11-13T00:00:00.000Z";
describe("generateSessions", () => {
  it("splits 180 min at 45 min into four sessions", () => {
    expect(generateSessions("t", 180, 45, NOW).map((s) => s.plannedMinutes)).toEqual([45, 45, 45, 45]);
  });
  it("puts the remainder in the last session", () => {
    expect(generateSessions("t", 100, 45, NOW).map((s) => s.plannedMinutes)).toEqual([45, 45, 10]);
  });
  it("is deterministic and handles no estimate or no preference", () => {
    expect(generateSessions("t", 60, 30, NOW)).toEqual(generateSessions("t", 60, 30, NOW));
    expect(generateSessions("t", 0, 30, NOW)).toEqual([]);
    expect(generateSessions("t", 50, undefined, NOW)).toHaveLength(1);
  });
});
describe("remainingMinutes", () => {
  it("keeps a partial session as one session with the remainder", () => {
    expect(remainingMinutes({ plannedMinutes: 60, completedMinutes: 30 })).toBe(30);
  });
  it("never goes negative", () => {
    expect(remainingMinutes({ plannedMinutes: 30, completedMinutes: 45 })).toBe(0);
  });
});
