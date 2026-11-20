"use client";
import { useEffect, useState } from "react";
import type { CalendarEvent, Session, Task, TimeboxEntry } from "@/domain/types";
import { addDays, formatMinute, toDateKey } from "@/lib/dates";
import { occursOn } from "@/lib/events";
import styles from "./Dashboard.module.css";

const HOUR = 44; // px per hour; 12 hours per column
interface Block { id: string; label: string; kind: "Event" | "Session"; start: number; end: number }
interface Props { now: Date; events: CalendarEvent[]; entries: TimeboxEntry[]; sessions: Session[]; tasks: Task[] }

const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" });
const jumpTo = (id: string) => {
  const el = document.getElementById(id);
  el?.setAttribute("tabindex", "-1");
  el?.focus();
  el?.scrollIntoView({ block: "center" });
};

function DayColumn({ from, blocks, nowMin }: { from: number; blocks: Block[]; nowMin: number | null }) {
  const c0 = from * 60;
  const c1 = c0 + 720;
  return (
    <div className={styles.tbCol} style={{ height: 12 * HOUR }}>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className={styles.tbHour} style={{ top: i * HOUR, height: HOUR }}>
          <span className={styles.tbLabel}>{hourLabel(from + i)}</span>
        </div>
      ))}
      {blocks.filter((b) => b.end > c0 && b.start < c1).map((b) => {
        const s = Math.max(b.start, c0);
        const e = Math.min(b.end, c1);
        const detail = `${b.kind}: ${b.label}, ${formatMinute(b.start)} to ${formatMinute(b.end)}`;
        return (
          <div
            key={b.id}
            tabIndex={0}
            aria-label={detail}
            aria-hidden={b.start < c0 || undefined} // second half of a block that crosses noon
            title={detail}
            className={`${styles.tbBlock} ${b.kind === "Session" ? styles.tbSession : styles.tbEvent}`}
            style={{ top: ((s - c0) / 60) * HOUR, height: Math.max(18, ((e - s) / 60) * HOUR) }}
          >
            <strong>{b.label}</strong> <span>{formatMinute(b.start)}–{formatMinute(b.end)}</span>
          </div>
        );
      })}
      {nowMin !== null && nowMin >= c0 && nowMin < c1 && (
        <div className={styles.tbNow} style={{ top: ((nowMin - c0) / 60) * HOUR }} role="img" aria-label={`Current time ${formatMinute(nowMin)}`} />
      )}
    </div>
  );
}

/** Read-only on Home: shows the whole day, no drag or resize. The Timebox page will add editing and overlap validation. */
export default function TimeboxWidget({ now, events, entries, sessions, tasks }: Props) {
  const [clock, setClock] = useState(now);
  const [day, setDay] = useState(toDateKey(now));
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 60_000); // moves the current-time line each minute
    return () => clearInterval(id);
  }, []);

  const blocks: Block[] = [
    ...events.filter((e) => occursOn(e, day)).map((e) => ({ id: e.id, label: e.title, kind: "Event" as const, start: e.startMinute, end: e.endMinute })),
    ...entries.filter((b) => b.date === day && b.sourceType === "session").flatMap((b) => {
      const s = sessions.find((x) => x.id === b.sourceId);
      const t = tasks.find((x) => x.id === s?.taskId);
      return s && t ? [{ id: b.id, label: `${t.title}, session ${s.sequence}`, kind: "Session" as const, start: b.startMinute, end: b.endMinute }] : [];
    }),
  ];
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const monthYear = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
  const nowMin = day === toDateKey(clock) ? clock.getHours() * 60 + clock.getMinutes() : null;
  const counts = [
    { icon: "📋", n: tasks.filter((t) => t.dueDate === day && t.status !== "completed").length, label: "tasks due", target: "task-h" },
    { icon: "📚", n: blocks.filter((b) => b.kind === "Session").length, label: "sessions", target: "ses-h" },
    { icon: "📅", n: blocks.filter((b) => b.kind === "Event").length, label: "events", target: "task-h" },
  ];

  return (
    <section className={styles.widget} aria-labelledby="tb-h">
      <header className={styles.tbHead}>
        <div>
          <h2 id="tb-h"><span className={styles.sr}>Timebox, </span>{monthYear}</h2>
          <div className={styles.tbDay}>
            <span className={styles.dayCircle}>{d}</span>
            <div>
              <button onClick={() => setDay((x) => addDays(x, -1))} aria-label="Previous day">‹</button>{" "}
              <button onClick={() => setDay((x) => addDays(x, 1))} aria-label="Next day">›</button>
              <div>{weekday}</div>
            </div>
            <button onClick={() => setDay(toDateKey(new Date()))}>Today</button>
          </div>
        </div>
        <div className={styles.counts}>
          {counts.map((c) => (
            <button key={c.label} onClick={() => jumpTo(c.target)} aria-label={`${c.n} ${c.label}. Go to the list.`} title={`${c.n} ${c.label}`}>
              <span aria-hidden="true">{c.icon}</span> {c.n}
            </button>
          ))}
        </div>
      </header>
      <div className={styles.tbCols}>
        <DayColumn from={0} blocks={blocks} nowMin={nowMin} />
        <DayColumn from={12} blocks={blocks} nowMin={nowMin} />
      </div>
    </section>
  );
}
