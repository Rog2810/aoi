const DAY_MS = 86_400_000;

export const toDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const keyToUtc = (key: string): number => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/**
 * Calendar-day difference in the user's LOCAL date. Both sides are reduced to Y/M/D and compared in UTC,
 * so a 23- or 25-hour DST day can never shift the answer (dividing local timestamps by 24h would).
 */
export const daysRemaining = (dueKey: string, today: Date = new Date()): number =>
  Math.round((keyToUtc(dueKey) - keyToUtc(toDateKey(today))) / DAY_MS);

/** Always shown next to the relative text; the absolute date is never replaced by "tomorrow". */
export const formatDueDate = (key: string, locale?: string): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(keyToUtc(key)));

export const describeRemaining = (n: number): string => {
  const plural = (v: number) => `${v} day${v === 1 ? "" : "s"}`;
  return n < 0 ? `${plural(-n)} overdue` : n === 0 ? "Due today" : `${plural(n)} remaining`;
};
