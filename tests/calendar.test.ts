import { describe, expect, it } from "vitest";
import { monthGrid } from "../src/lib/calendar";

describe("monthGrid", () => {
  it("starts on Monday by default; Nov 1 2026 is a Sunday so Oct 26 leads", () => {
    const g = monthGrid(2026, 10);
    expect(g).toHaveLength(42);
    expect(g[0]).toMatchObject({ key: "2026-10-26", inMonth: false });
    expect(g[6]).toMatchObject({ key: "2026-11-01", inMonth: true });
  });
  it("supports a Sunday start", () => {
    expect(monthGrid(2026, 10, 0)[0]).toMatchObject({ key: "2026-11-01", inMonth: true });
  });
  it("handles leap years", () => {
    expect(monthGrid(2028, 1).filter((c) => c.inMonth)).toHaveLength(29);
    expect(monthGrid(2027, 1).filter((c) => c.inMonth)).toHaveLength(28);
  });
});
