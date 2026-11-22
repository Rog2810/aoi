"use client";
import { useState, type CSSProperties } from "react";
import { categoryFor } from "@/config/categories";
import type { Task } from "@/domain/types";
import { monthGrid, type WeekStart } from "@/lib/calendar";
import { formatDueDate, toDateKey } from "@/lib/dates";
import WidgetFrame from "./WidgetFrame";
import styles from "./Dashboard.module.css";

const MAX_LANES = 6;
interface Span { id: string; start: string; end: string; color: string; lane: number }

/** Display-only: each open task is a colored line from its created date to its due date. */
export default function CalendarWidget({ now, tasks, weekStart = 1 }: { now: Date; tasks: Task[]; weekStart?: WeekStart }) {
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const today = toDateKey(now);
  const shift = (n: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const open = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  // Greedy lanes: overlapping spans stack on separate rows instead of covering each other.
  const ends: string[] = [];
  const spans: Span[] = open
    .map((t) => {
      const created = toDateKey(new Date(t.createdAt));
      return { id: t.id, start: created < t.dueDate ? created : t.dueDate, end: t.dueDate, color: categoryFor(t.categoryIds).color, lane: 0 };
    })
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
    .map((s) => {
      let lane = ends.findIndex((e) => e < s.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = s.end;
      return { ...s, lane };
    })
    .filter((s) => s.lane < MAX_LANES);
  const lanes = Math.min(ends.length, MAX_LANES) || 1;

  const cells = monthGrid(month.y, month.m, weekStart);
  const weeks = Array.from({ length: 6 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(2024, 0, 1 + i - (weekStart ? 0 : 1))),
  ); // 2024-01-01 was a Monday
  const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(month.y, month.m, 1));

  return (
    <WidgetFrame
      title={label}
      id="cal-h"
      actions={
        <div>
          <button onClick={() => shift(-1)} aria-label="Previous month">‹</button>{" "}
          <button onClick={() => shift(1)} aria-label="Next month">›</button>
        </div>
      }
    >
      <div role="table" aria-label="Month calendar. Colored lines run from each task's start date to its due date." className={styles.calTable} style={{ "--lanes": lanes } as CSSProperties}>
        <div role="row" className={styles.calHead}>
          {weekdays.map((d) => <span key={d} role="columnheader">{d}</span>)}
        </div>
        {weeks.map((week) => {
          const row = week.map((c) => c.key);
          return (
            <div key={row[0]} role="row" className={styles.week}>
              {week.map((c) => {
                const n = open.filter((t) => t.dueDate === c.key).length;
                return (
                  <div
                    key={c.key}
                    role="cell"
                    className={styles.dayCell}
                    aria-current={c.key === today ? "date" : undefined}
                    aria-label={`${formatDueDate(c.key)}${n ? `, ${n} task${n > 1 ? "s" : ""} due` : ""}`}
                  >
                    <span className={[styles.dayNum, !c.inMonth && styles.muted, c.key === today && styles.todayNum].filter(Boolean).join(" ")}>{c.day}</span>
                  </div>
                );
              })}
              <div className={styles.lines} aria-hidden="true" style={{ gridTemplateRows: `repeat(${lanes}, minmax(2px, 6px))` }}>
                {spans.filter((s) => s.end >= row[0] && s.start <= row[6]).map((s) => {
                  const a = s.start <= row[0] ? 0 : row.indexOf(s.start);
                  const b = s.end >= row[6] ? 6 : row.indexOf(s.end);
                  const l = s.start >= row[0] ? 3 : 0; // round only the real start/end, not week breaks
                  const r = s.end <= row[6] ? 3 : 0;
                  return <span key={s.id} className={styles.line} style={{ gridColumn: `${a + 1} / ${b + 2}`, gridRow: s.lane + 1, background: s.color, borderRadius: `${l}px ${r}px ${r}px ${l}px` }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </WidgetFrame>
  );
}
