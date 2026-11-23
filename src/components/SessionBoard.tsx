"use client";
import { useState } from "react";
import { CATEGORIES } from "@/config/categories";
import type { Session, Task, TimeboxEntry } from "@/domain/types";
import { addDays, daysRemaining, describeRemaining, formatDueDate, formatMinute, toDateKey } from "@/lib/dates";
import { remainingMinutes } from "@/lib/sessions";
import { groupSessions, segmentsFor, type SessionColumn } from "@/lib/sessionBoard";
import MarqueeText from "./MarqueeText";
import ScheduleDialog from "./ScheduleDialog";
import SessionStack, { type StackItem } from "./SessionStack";
import { useNow } from "./useNow";
import { useTaskData } from "./useTaskData";
import styles from "./pages.module.css";

const COLUMNS: { id: SessionColumn; title: string }[] = [
  { id: "unscheduled", title: "Unscheduled" },
  { id: "scheduled", title: "Scheduled" },
  { id: "completed-today", title: "Completed Today" },
];

function slotLabel(e: TimeboxEntry, today: string): string {
  const [y, m, d] = e.date.split("-").map(Number);
  const day =
    e.date === today ? "Today" : e.date === addDays(today, 1) ? "Tomorrow" : new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(y, m - 1, d));
  return `${day} ${formatMinute(e.startMinute)} to ${formatMinute(e.endMinute)}`;
}

export default function SessionBoard() {
  const now = useNow();
  return now ? <Board now={now} /> : <p role="status">Loading…</p>;
}

function Board({ now }: { now: Date }) {
  const d = useTaskData(now);
  const [target, setTarget] = useState<{ session: Session; task: Task } | null>(null);
  if (d.status === "loading") return <p role="status">Loading…</p>;

  const today = toDateKey(now);
  const groups = groupSessions(d.tasks, d.sessions, d.timebox, d.completions, today);
  const firstSlot = (id: string) =>
    d.timebox.filter((e) => e.sourceType === "session" && e.sourceId === id).sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute)[0];

  const itemFor = (col: SessionColumn, task: Task, s: Session, i: number): StackItem => {
    if (col === "unscheduled") {
      return {
        id: s.id,
        grip: true,
        body: (
          <>
            <div className={styles.tx}>
              <div><strong>Session {s.sequence}</strong> · {s.plannedMinutes} min</div>
              <div className={styles.muted}>{i === 0 ? "Next · " : ""}Not scheduled</div>
            </div>
            <button onClick={() => setTarget({ session: s, task })} aria-label={`Schedule ${task.title}, session ${s.sequence}`}>Schedule</button>
          </>
        ),
      };
    }
    if (col === "scheduled") {
      const slot = firstSlot(s.id);
      return {
        id: s.id,
        grip: true,
        body: (
          <div className={styles.tx}>
            <div><strong>Session {s.sequence}</strong> · {s.plannedMinutes} min planned</div>
            {s.completedMinutes > 0 && <div className={styles.muted}>{s.completedMinutes} done · {remainingMinutes(s)} left</div>}
            {slot && <div className={styles.muted}>{slotLabel(slot, today)}</div>}
          </div>
        ),
      };
    }
    const rec = d.completions.find((c) => c.sourceType === "session" && c.sourceId === s.id && c.localDate === today);
    const at = rec ? new Date(rec.completedAt) : null;
    return {
      id: s.id,
      grip: false,
      body: (
        <>
          <div className={styles.tx}>
            <div><strong>Session {s.sequence}</strong> · {s.completedMinutes} min worked</div>
            <div className={styles.muted}>Planned {s.plannedMinutes}{at ? ` · finished ${formatMinute(at.getHours() * 60 + at.getMinutes())}` : ""}</div>
          </div>
          <button onClick={() => d.undoSession(s)} aria-label={`Undo completion of ${task.title}, session ${s.sequence}`}>Undo</button>
        </>
      ),
    };
  };

  return (
    <>
      {d.status === "error" && (
        <p role="alert" className={styles.error}>
          Changes could not be saved on this device. Aoi is running from memory, so anything you change will be lost when you close this tab.
        </p>
      )}
      <h1 className={styles.pageTitle}>Timebox</h1>
      <div className={styles.split}>
        <section aria-labelledby="backlog-h" className={styles.backlog}>
          <h2 id="backlog-h">Session backlog</h2>
          <div className={styles.board}>
            {COLUMNS.map((col) => {
              const list = groups[col.id];
              const count = list.reduce((n, g) => n + g.sessions.length, 0);
              return (
                <section key={col.id} className={styles.column} aria-labelledby={`scol-${col.id}`}>
                  <h3 id={`scol-${col.id}`} className={styles.colTitle}>{col.title} <span className={styles.count}>({count} {count === 1 ? "session" : "sessions"})</span></h3>
                  {list.length === 0 ? (
                    <p className={styles.muted}>Nothing here.</p>
                  ) : (
                    <ul className={styles.cards2}>
                      {list.map(({ task, sessions }) => {
                        const segs = segmentsFor(d.sessions, task.id);
                        const finished = segs.filter((x) => x === "done").length;
                        const started = segs.filter((x) => x === "half").length;
                        const parent = d.tasks.find((p) => p.id === task.parentId);
                        const cats = CATEGORIES.filter((c) => task.categoryIds.includes(c.id));
                        const tall = col.id === "scheduled" && sessions.some((s) => s.completedMinutes > 0);
                        return (
                          <li key={task.id} className={styles.card} data-marquee-host>
                            <MarqueeText className={styles.cardTitle}>{task.title}</MarqueeText>
                            {parent && <div className={styles.muted}>Subtask of {parent.title}</div>}
                            <div>{formatDueDate(task.dueDate)}</div>
                            <div><strong>{describeRemaining(daysRemaining(task.dueDate, now))}</strong></div>
                            {cats.length > 0 && (
                              <div className={styles.chips}>
                                {cats.map((c) => <span key={c.id} className={styles.chip}><span className={styles.swatch} style={{ background: c.color }} aria-hidden="true" />{c.name}</span>)}
                              </div>
                            )}
                            <div className={styles.strip}>
                              <span className={styles.segs} role="img" aria-label={`${finished} of ${segs.length} sessions done${started ? `, ${started} in progress` : ""}`}>
                                {segs.map((x, i) => <span key={i} className={x === "done" ? `${styles.seg} ${styles.segDone}` : x === "half" ? `${styles.seg} ${styles.segHalf}` : styles.seg} />)}
                              </span>
                              <span className={styles.muted}>{finished} of {segs.length} sessions done</span>
                            </div>
                            <SessionStack items={sessions.map((s, i) => itemFor(col.id, task, s, i))} height={tall ? 76 : 64} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </section>

        {/* Placeholder: the editable timebox (drag, move, resize, five-minute snapping) replaces this box later. */}
        <aside aria-labelledby="tb-h" className={styles.placeholder}>
          <h2 id="tb-h">Daily timebox</h2>
          <p className={styles.muted}>Placeholder. The editable timebox goes here: drag sessions from the backlog, move and resize them, five-minute snapping.</p>
          <div className={styles.hours}>
            <div><span className={styles.muted}>12 AM to 11 AM</span><div className={styles.hourCol} /></div>
            <div><span className={styles.muted}>12 PM to 11 PM</span><div className={styles.hourCol} /></div>
          </div>
        </aside>
      </div>

      <ScheduleDialog target={target} entries={d.timebox} events={d.events} today={today} onClose={() => setTarget(null)} onSchedule={d.scheduleSession} />
    </>
  );
}
