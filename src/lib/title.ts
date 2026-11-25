/** Prefixes put on the page title to flag a session that needs attention. */
export const TITLE_FLAGS = { paused: "⏸ Paused · ", due: "⏰ Time's up · " } as const;
export type TitleFlag = keyof typeof TITLE_FLAGS;

/** The title with every session flag removed, however many times one was added. */
export function plainTitle(title: string): string {
  let out = title;
  for (let changed = true; changed; ) {
    changed = false;
    for (const prefix of Object.values(TITLE_FLAGS)) {
      if (out.startsWith(prefix)) {
        out = out.slice(prefix.length);
        changed = true;
      }
    }
  }
  return out;
}

/** Applying this twice gives the same result as applying it once. */
export const flaggedTitle = (title: string, flag: TitleFlag | null): string => (flag ? TITLE_FLAGS[flag] : "") + plainTitle(title);
