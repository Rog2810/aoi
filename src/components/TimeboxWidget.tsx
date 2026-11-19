"use client";
import { useEffect, useRef, useState } from "react";
import type { CalendarEvent, Session, Task, TimeboxEntry } from "@/domain/types";
import { addDays, formatDueDate, formatMinute, toDateKey } from "@/lib/dates";
import { occursOn } from "@/lib/events";
import WidgetFrame from "./WidgetFrame";
import styles from "./Dashboard.module.css";

const HOUR = 40; // px per hour
interface Block { id: string; label: string; kind: "Event" | "Session"; start: number; end: number }
interface Props { now: Date; events: CalendarEvent[]; entries: TimeboxEntry[]; sessions: Session[]; tasks: Task[] }

/** Read-only on Home: no drag or resize. The Timebox page will add editing and overlap validation. */
export default function TimeboxWidget({ now, events, entries, sessions, tasks }: Props) {
  const [clock, setClock] = useState(now);
  const [day, setDay] = useState(toDateKey(now));
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 60_000); // moves the current-time line each minute
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * HOUR;
  }, []);

  const blocks: Block[] = [
    ...events.filter((e) => occursOn(e, day)).map((e) => ({ id: e.id, label: e.title, kind: "Event" as const, start: e.startMinute, end: e.endMinute })),
    ...entries.filter((b) => b.date === day && b.sourceType === "session").flatMap((b) => {
      const s = sessions.find((x) => x.id === b.sourceId);
      const t = tasks.find((x) => x.id === s?.taskId);
      return s && t ? [{ id: b.id, label: `${t.title}, session ${s.sequence}`, kind: "Session" as const, start: b.startMinute, end: b.endMinute }] : [];
    }),
  ];
  const mins = clock.getHours() * 60 + clock.getMinutes();

  return (
    <WidgetFrame
      title="Timebox"
      id="tb-h"
      actions={
        <div>
          <button onClick={() => setDay((d) => addDays(d, -1))} aria-label="Previous day">‹</button>{" "}
          <button onClick={() => setDay(toDateKey(new Date()))}>Today</button>{" "}
          <button onClick={() => setDay((d) => addDays(d, 1))} aria-label="Next day">›</button>
        </div>
      }
    >
      <p className={styles.muted}>{formatDueDate(day)}</p>
      <div ref={scroller} className={styles.tbScroll} role="region" aria-label="Daily timebox, scrolls vertically" tabIndex={0}>
        <div className={styles.tbBody} style={{ height: 24 * HOUR }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className={styles.tbHour} style={{ top: h * HOUR }}>
              <span className={styles.tbLabel}>{formatMinute(h * 60)}</span>
            </div>
          ))}
          {blocks.map((b) => {
            const detail = `${b.kind}: ${b.label}, ${formatMinute(b.start)} to ${formatMinute(b.end)}`;
            return (
              <div
                key={b.id}
                tabIndex={0}
                aria-label={detail}
                title={detail}
                className={`${styles.tbBlock} ${b.kind === "Session" ? styles.tbSession : styles.tbEvent}`}
                style={{ top: (b.start / 60) * HOUR, height: Math.max(18, ((b.end - b.start) / 60) * HOUR) }}
              >
                <strong>{b.label}</strong> <span>{formatMinute(b.start)}–{formatMinute(b.end)}</span>
              </div>
            );
          })}
          {day === toDateKey(clock) && <div className={styles.tbNow} style={{ top: (mins / 60) * HOUR }} role="img" aria-label={`Current time ${formatMinute(mins)}`} />}
        </div>
      </div>
    </WidgetFrame>
  );
}
