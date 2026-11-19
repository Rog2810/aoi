"use client";
import { useEffect, useState } from "react";
import type { TaskStatus } from "@/domain/types";
import { SAMPLE_TASKS } from "@/fixtures/tasks";
import { monthGrid, type WeekStart } from "@/lib/calendar";
import { daysRemaining, describeRemaining, formatDueDate, toDateKey } from "@/lib/dates";
import styles from "./Dashboard.module.css";

/** Date/locale are read after mount so server and browser output cannot disagree (hydration). */
export default function Dashboard() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now ? <Board now={now} /> : <p role="status">Loading…</p>;
}

function Board({ now }: { now: Date }) {
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [weekStart, setWeekStart] = useState<WeekStart>(1);
  const [selected, setSelected] = useState(toDateKey(now));
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const today = toDateKey(now);

  const shift = (n: number) =>
    setMonth(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const setStatus = (id: string, status: TaskStatus) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString(), revision: t.revision + 1 } : t)));

  const active = tasks.filter((t) => t.status !== "completed").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const done = tasks.filter((t) => t.status === "completed");
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(2024, 0, 1 + i - (weekStart ? 0 : 1))),
  ); // 2024-01-01 was a Monday
  const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(month.y, month.m, 1));

  return (
    <div className={styles.grid}>
      <section className={styles.widget} aria-labelledby="cal-h">
        <header className={styles.head}>
          <h2 id="cal-h">{label}</h2>
          <div>
            <button onClick={() => shift(-1)} aria-label="Previous month">‹</button>{" "}
            <button onClick={() => shift(1)} aria-label="Next month">›</button>
          </div>
        </header>
        <button onClick={() => setWeekStart((w) => (w === 1 ? 0 : 1))}>Week starts on {weekStart === 1 ? "Monday" : "Sunday"}</button>
        <div className={styles.cal}>
          {weekdays.map((d) => <span key={d} className={styles.muted}>{d}</span>)}
          {monthGrid(month.y, month.m, weekStart).map((c) => (
            <button
              key={c.key}
              onClick={() => setSelected(c.key)}
              aria-label={formatDueDate(c.key)}
              aria-pressed={c.key === selected}
              aria-current={c.key === today ? "date" : undefined}
              className={[styles.cell, !c.inMonth && styles.muted, c.key === today && styles.today, c.key === selected && styles.selected].filter(Boolean).join(" ")}
            >
              {c.day}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.widget} aria-labelledby="task-h">
        <h2 id="task-h">Tasks</h2>
        {active.length === 0 && <p>No open tasks.</p>}
        <ul className={styles.tasks}>
          {active.map((t) => {
            const parent = tasks.find((p) => p.id === t.parentId);
            return (
              <li key={t.id} className={styles.task}>
                <div>
                  <div className={styles.title}>{t.title}</div>
                  {parent && <div className={styles.muted}>Subtask of {parent.title}</div>}
                  <div>{formatDueDate(t.dueDate)} · {describeRemaining(daysRemaining(t.dueDate, now))}</div>
                  <div className={styles.muted}>{t.estimateMinutes} min estimated</div>
                </div>
                <button onClick={() => setStatus(t.id, "completed")} aria-label={`Complete ${t.title}`}>Complete</button>
              </li>
            );
          })}
        </ul>
        {done.length > 0 && (
          <>
            <h3>Completed today</h3>
            <ul className={styles.tasks}>
              {done.map((t) => (
                <li key={t.id} className={styles.task}>
                  <span className={styles.title}>{t.title}</span>
                  <button onClick={() => setStatus(t.id, "not-started")} aria-label={`Undo completion of ${t.title}`}>Undo</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
