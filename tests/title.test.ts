import { describe, expect, it } from "vitest";
import { flaggedTitle, plainTitle } from "../src/lib/title";

describe("session title flags", () => {
  it("removes stacked flags", () => {
    expect(plainTitle("⏸ Paused · ⏸ Paused · ⏰ Time's up · Aoi")).toBe("Aoi");
  });
  it("is stable when applied repeatedly", () => {
    const once = flaggedTitle("Aoi", "paused");
    expect(flaggedTitle(once, "paused")).toBe(once);
    expect(once).toBe("⏸ Paused · Aoi");
  });
  it("switches between flags and clears them", () => {
    expect(flaggedTitle("⏸ Paused · Aoi", "due")).toBe("⏰ Time's up · Aoi");
    expect(flaggedTitle("⏰ Time's up · Aoi", null)).toBe("Aoi");
  });
});
