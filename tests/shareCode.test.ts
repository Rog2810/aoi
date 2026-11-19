import { describe, expect, it } from "vitest";
import { decodeLayoutShareCode, encodeLayoutShareCode, type LayoutConfig } from "../src/lib/shareCode";

const cfg: LayoutConfig = {
  schemaVersion: 1,
  name: "Study ✦",
  widgets: [{ instanceId: "cal-1", type: "calendar", x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 4, visible: true }],
};

describe("share codes", () => {
  it("round-trips and is URL-safe", () => {
    const code = encodeLayoutShareCode(cfg);
    expect(code).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(decodeLayoutShareCode(code)).toEqual({ ok: true, layout: cfg });
  });
  it("rejects edited codes", () => {
    const [p, body, sum] = encodeLayoutShareCode(cfg).split(".");
    expect(decodeLayoutShareCode(`${p}.${body.slice(0, -2)}AA.${sum}`).ok).toBe(false);
  });
  it("rejects garbage safely", () => {
    expect(decodeLayoutShareCode("hello").ok).toBe(false);
    expect(decodeLayoutShareCode("aoi.!!!.x").ok).toBe(false);
  });
  it("rejects unsupported schema versions", () => {
    const future = encodeLayoutShareCode({ ...cfg, schemaVersion: 2 } as unknown as LayoutConfig);
    expect(decodeLayoutShareCode(future)).toEqual({ ok: false, error: "Unsupported layout version: 2." });
  });
});
