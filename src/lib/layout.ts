/** Aoi-owned placement model. A drag/resize library is wrapped by an adapter; its shape is never persisted. */
export interface WidgetPlacement {
  instanceId: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  visible: boolean;
}

const hit = (a: WidgetPlacement, b: WidgetPlacement) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Touching edges are not overlaps; hidden widgets never conflict. */
export function findOverlaps(ws: WidgetPlacement[]): [string, string][] {
  const v = ws.filter((w) => w.visible);
  return v.flatMap((a, i) => v.slice(i + 1).filter((b) => hit(a, b)).map((b): [string, string] => [a.instanceId, b.instanceId]));
}

/** Returns human-readable problems; Save must stay blocked while this is non-empty. */
export function validateLayout(ws: WidgetPlacement[]): string[] {
  const errors = ws.filter((w) => w.w < w.minW || w.h < w.minH).map((w) => `${w.instanceId} is smaller than its minimum size.`);
  return [...errors, ...findOverlaps(ws).map(([a, b]) => `${a} overlaps ${b}.`)];
}

/** TODO(auto-arrange): contract only. The Edit Layout sidebar shows this disabled with a "Planned" label. */
export function autoArrangeLayout(_widgets: WidgetPlacement[]): WidgetPlacement[] {
  throw new Error("Auto-arrange is not available in the prototype.");
}
