import type { WidgetPlacement } from "./layout";

/** Layout-only config. Deliberately has no field that could hold tasks, events, tags or account data. */
export interface LayoutConfig {
  schemaVersion: 1;
  name: string;
  widgets: WidgetPlacement[];
}
export type DecodeResult = { ok: true; layout: LayoutConfig } | { ok: false; error: string };

const SCHEMA_VERSION = 1;
const fail = (error: string): DecodeResult => ({ ok: false, error });

const checksum = (s: string) => {
  let h = 0x811c9dc5; // FNV-1a: detects accidental damage and edits, not tampering by a determined attacker
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
};
const toB64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

/** Self-contained, non-expiring, URL-safe: "aoi.<base64url JSON>.<checksum>". No server record is involved. */
export function encodeLayoutShareCode(layout: LayoutConfig): string {
  const widgets = layout.widgets.map(({ instanceId, type, x, y, w, h, minW, minH, visible }) => ({ instanceId, type, x, y, w, h, minW, minH, visible }));
  const json = JSON.stringify({ schemaVersion: layout.schemaVersion, name: layout.name, widgets });
  return `aoi.${toB64Url(json)}.${checksum(json)}`;
}

/** Validates before anything is imported. Future versions migrate here (switch on schemaVersion). */
export function decodeLayoutShareCode(code: string): DecodeResult {
  const [prefix, body, sum, ...extra] = code.trim().split(".");
  if (prefix !== "aoi" || !body || !sum || extra.length) return fail("This is not an Aoi layout code.");
  let json: string;
  try {
    json = fromB64Url(body);
  } catch {
    return fail("The layout code is damaged.");
  }
  if (checksum(json) !== sum) return fail("The layout code failed its integrity check.");
  let data: Partial<LayoutConfig>;
  try {
    data = JSON.parse(json);
  } catch {
    return fail("The layout code is damaged.");
  }
  if (data.schemaVersion !== SCHEMA_VERSION) return fail(`Unsupported layout version: ${String(data.schemaVersion)}.`);
  if (typeof data.name !== "string" || !Array.isArray(data.widgets)) return fail("The layout code is incomplete.");
  return { ok: true, layout: data as LayoutConfig };
}
