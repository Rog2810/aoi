import { describe, expect, it } from "vitest";
import { findOverlaps, validateLayout, type WidgetPlacement } from "../src/lib/layout";

const w = (instanceId: string, x: number, y: number, extra: Partial<WidgetPlacement> = {}): WidgetPlacement =>
  ({ instanceId, type: "calendar", x, y, w: 4, h: 4, minW: 2, minH: 2, visible: true, ...extra });

describe("layout validation", () => {
  it("detects overlap but not touching edges", () => {
    expect(findOverlaps([w("a", 0, 0), w("b", 2, 2)])).toEqual([["a", "b"]]);
    expect(findOverlaps([w("a", 0, 0), w("b", 4, 0)])).toEqual([]);
  });
  it("ignores hidden widgets", () => {
    expect(findOverlaps([w("a", 0, 0), w("b", 1, 1, { visible: false })])).toEqual([]);
  });
  it("blocks overlaps and undersized widgets", () => {
    expect(validateLayout([w("a", 0, 0), w("b", 1, 1)])).toHaveLength(1);
    expect(validateLayout([w("a", 0, 0, { w: 1 })])).toHaveLength(1);
    expect(validateLayout([w("a", 0, 0), w("b", 4, 0)])).toEqual([]);
  });
});
