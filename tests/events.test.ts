import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../src/domain/types";
import { addDays } from "../src/lib/dates";
import { occursOn } from "../src/lib/events";

describe("addDays", () => {
  it("crosses month and leap-day boundaries", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-11-19", -19)).toBe("2026-10-31");
  });
});

describe("occursOn", () => {
  const ev = (recurrence: CalendarEvent["recurrence"]) => ({ date: "2026-11-02", recurrence });
  it("handles one-off events", () => {
    expect(occursOn(ev("never"), "2026-11-02")).toBe(true);
    expect(occursOn(ev("never"), "2026-11-03")).toBe(false);
  });
  it("never occurs before its first date", () => {
    expect(occursOn(ev("daily"), "2026-11-01")).toBe(false);
    expect(occursOn(ev("daily"), "2026-11-20")).toBe(true);
  });
  it("repeats weekly and monthly on the right days", () => {
    expect(occursOn(ev("weekly"), "2026-11-09")).toBe(true);
    expect(occursOn(ev("weekly"), "2026-11-10")).toBe(false);
    expect(occursOn(ev("monthly"), "2026-12-02")).toBe(true);
    expect(occursOn(ev("monthly"), "2026-12-03")).toBe(false);
  });
});
