import { toDateKey } from "./dates";

export type WeekStart = 0 | 1; // 0 = Sunday, 1 = Monday (default)
export interface DayCell {
  key: string;
  day: number;
  inMonth: boolean;
}

/** Always 42 cells (6 weeks) so the grid never changes height while navigating months. */
export function monthGrid(year: number, month: number, weekStart: WeekStart = 1): DayCell[] {
  const lead = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month, 1 - lead + i);
    return { key: toDateKey(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}
