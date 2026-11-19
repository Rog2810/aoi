import { describe, expect, it } from "vitest";
import { describeRemaining, daysRemaining, formatDueDate } from "../src/lib/dates";

describe("daysRemaining", () => {
  it("counts whole calendar days, ignoring time of day", () => {
    expect(daysRemaining("2026-11-20", new Date(2026, 10, 11, 23, 30))).toBe(9);
  });
  it("stays exact across the US spring-forward day", () => {
    expect(daysRemaining("2026-03-09", new Date(2026, 2, 7, 0, 30))).toBe(2);
  });
  it("reports overdue and today distinctly", () => {
    expect(describeRemaining(daysRemaining("2026-11-10", new Date(2026, 10, 13)))).toBe("3 days overdue");
    expect(describeRemaining(0)).toBe("Due today");
  });
  it("keeps the absolute date", () => {
    expect(formatDueDate("2026-11-20", "en-US")).toBe("November 20, 2026");
  });
});
