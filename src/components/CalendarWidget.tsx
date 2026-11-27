"use client";
import { useState, type CSSProperties } from "react";
import { categoryFor } from "@/config/categories";
import { LOAD_LABELS, LOAD_STEPS_MINUTES, MAX_STACK_LINES } from "@/config/load";
import type { Task } from "@/domain/types";
import { monthGrid, type WeekStart } from "@/lib/calendar";
import { formatDueDate, toDateKey } from "@/lib/dates";
import WidgetFrame from "./WidgetFrame";
import styles from "./Dashboard.module.css";

interface Span { id: string; start: string; end: string; color: string; perDay: number }
interface Props {
  now: Date;
  tasks: Task[];
  weekStart?: WeekStart;
  /** The task whose span is highlighted. Share it with the task list so hovering either one lights up both. */
  activeTaskId?: string | null;
  onActiveTask?: (id: string | null) => void;
}

const MAX_DOTS = 3;
const dayNumber = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};
/** 0 = nothing planned, 1 to 4 = the steps set in config/load.ts. */
const loadLevel = (minutes: number) => (minutes <= 0 ? 0 : 1 + LOAD_STEPS_MINUTES.filter((edge) => minutes > edge).length);

/**
 * Display-only. Each day shows three things: its shade (planned minutes, from the open tasks' estimates spread over
 * their days), a corner stack with one short line per open task that day, and a dot for each task due that day.
 * Hovering a line or dot (or the task in the list) highlights that task's whole span along the top of its days.
 */
export default function CalendarWidget({ now, tasks, weekStart = 1, activeTaskId, onActiveTask }: Props) {
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [localActive, setLocalActive] = useState<string | null>(null);
  const active = activeTaskId !== undefined ? activeTaskId : localActive;
  const setActive = onActiveTask ?? setLocalActive;
  const hover = (id: string) => ({ onMouseEnter: () => setActive(id), onMouseLeave: () => setActive(null) });

  const today = toDateKey(now);
  const shift = (n: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const spans: Span[] = tasks
    .filter((t) => t.status !== "completed" && t.status !== "cancelled")
    .map((t) => {
      const created = toDateKey(new Date(t.createdAt));
      const start = created < t.dueDate ? created : t.dueDate;
      const days = dayNumber(t.dueDate) - dayNumber(start) + 1;
      return { id: t.id, start, end: t.dueDate, color: categoryFor(t.categoryIds).color, perDay: (t.estimateMinutes || 0) / days };
    })
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

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
      <div role="table" aria-label="Month calendar. Darker days have more planned work, short lines count open tasks, and dots mark due dates." className={styles.calTable}>
        <div role="row" className={styles.calHead}>
          {weekdays.map((d) => <span key={d} role="columnheader">{d}</span>)}
        </div>
        {weeks.map((week) => (
          <div key={week[0].key} role="row" className={styles.week}>
            {week.map((c) => {
              const on = spans
                .filter((s) => s.start <= c.key && c.key <= s.end)
                .sort((a, b) => a.end.localeCompare(b.end));
              const due = on.filter((s) => s.end === c.key);
              const level = loadLevel(on.reduce((sum, s) => sum + s.perDay, 0));
              const lit = active ? on.find((s) => s.id === active) : undefined;
              const dim = (id: string) => (active && id !== active ? ` ${styles.dim}` : "");
              const parts = [formatDueDate(c.key)];
              if (due.length) parts.push(`${due.length} task${due.length > 1 ? "s" : ""} due`);
              if (on.length) parts.push(`${on.length} open task${on.length > 1 ? "s" : ""}`);
              if (level) parts.push(`${LOAD_LABELS[level].toLowerCase()} workload`);
              return (
                <div
                  key={c.key}
                  role="cell"
                  className={`${styles.dayCell} ${styles[`load${level}`]}`}
                  style={lit ? ({ boxShadow: `inset 0 3px 0 ${lit.color}` } as CSSProperties) : undefined}
                  aria-current={c.key === today ? "date" : undefined}
                  aria-label={parts.join(", ")}
                >
                  <span className={[styles.dayNum, !c.inMonth && styles.muted, c.key === today && styles.todayNum].filter(Boolean).join(" ")}>{c.day}</span>
                  {on.length > 0 && (
                    <span className={styles.stack} aria-hidden="true">
                      {on.slice(0, MAX_STACK_LINES).map((s) => (
                        <span key={s.id} className={`${styles.stackLine}${dim(s.id)}`} style={{ background: s.color }} {...hover(s.id)} />
                      ))}
                      {on.length > MAX_STACK_LINES && <span className={styles.stackMore}>+{on.length - MAX_STACK_LINES}</span>}
                    </span>
                  )}
                  {due.length > 0 && (
                    <span className={styles.dots} aria-hidden="true">
                      {due.slice(0, MAX_DOTS).map((s) => (
                        <span key={s.id} className={`${styles.dot}${dim(s.id)}`} style={{ background: s.color }} {...hover(s.id)} />
                      ))}
                      {due.length > MAX_DOTS && <span className={styles.stackMore}>+{due.length - MAX_DOTS}</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
