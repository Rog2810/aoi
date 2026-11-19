"use client";
import { useState } from "react";
import type { Task } from "@/domain/types";
import { monthGrid, type WeekStart } from "@/lib/calendar";
import { formatDueDate, toDateKey } from "@/lib/dates";
import WidgetFrame from "./WidgetFrame";
import styles from "./Dashboard.module.css";

export default function CalendarWidget({ now, tasks }: { now: Date; tasks: Task[] }) {
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [weekStart, setWeekStart] = useState<WeekStart>(1);
  const [selected, setSelected] = useState(toDateKey(now));
  const today = toDateKey(now);
  const shift = (n: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const due = (key: string) => tasks.filter((t) => t.dueDate === key && t.status !== "completed").length;
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
      <button onClick={() => setWeekStart((w) => (w === 1 ? 0 : 1))}>Week starts on {weekStart === 1 ? "Monday" : "Sunday"}</button>
      <div className={styles.cal}>
        {weekdays.map((d) => <span key={d} className={styles.muted}>{d}</span>)}
        {monthGrid(month.y, month.m, weekStart).map((c) => {
          const n = due(c.key);
          return (
            <button
              key={c.key}
              onClick={() => setSelected(c.key)}
              aria-label={`${formatDueDate(c.key)}${n ? `, ${n} task${n > 1 ? "s" : ""} due` : ""}`}
              aria-pressed={c.key === selected}
              aria-current={c.key === today ? "date" : undefined}
              className={[styles.cell, !c.inMonth && styles.muted, c.key === today && styles.today, c.key === selected && styles.selected].filter(Boolean).join(" ")}
            >
              {c.day}
              {n > 0 && <span aria-hidden="true" className={styles.mark}>•</span>}
            </button>
          );
        })}
      </div>
    </WidgetFrame>
  );
}
