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

export const daysBetween = (fromKey: string, toKey: string): number => Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / DAY_MS);

/** Pure calendar arithmetic on "YYYY-MM-DD" keys (UTC internally, so DST never matters). */
export const addDays = (key: string, n: number): string => {
  const t = new Date(keyToUtc(key) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
};

/** Minutes from midnight -> locale time text, e.g. 540 -> "9:00 AM". */
export const formatMinute = (m: number): string =>
  new Date(2000, 0, 1, Math.floor(m / 60) % 24, m % 60).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
