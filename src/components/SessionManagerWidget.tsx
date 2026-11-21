"use client";
import { useEffect, useState } from "react";
import type { Session, Task, TimeboxEntry } from "@/domain/types";
import { formatMinute, toDateKey } from "@/lib/dates";
import WidgetFrame from "./WidgetFrame";
import styles from "./Dashboard.module.css";

interface Item { entry: TimeboxEntry; session: Session; task: Task }
interface Props { entries: TimeboxEntry[]; sessions: Session[]; tasks: Task[]; onProgress: (s: Session) => void }

const R = 44;
const C = 2 * Math.PI * R;

/**
 * Focus-timer style session manager. The queue comes from today's timebox entries, so scheduling on the
 * Timebox page changes what appears here. EXTENSION POINT: auto-start at the scheduled time, and writing a
 * CompletionRecord when a session finishes, both belong in this component's onProgress callers.
 */
export default function SessionManagerWidget({ entries, sessions, tasks, onProgress }: Props) {
  const [skipped, setSkipped] = useState<string[]>([]); // ids sent to the back of today's queue, in skip order
  const [elapsed, setElapsed] = useState(0); // seconds already worked in the current session
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const today = toDateKey(new Date());
  const scheduledToday = entries.filter((e) => e.date === today && e.sourceType === "session");
  const pending: Item[] = [...scheduledToday]
    .sort((a, b) => a.startMinute - b.startMinute)
    .flatMap((entry) => {
      const session = sessions.find((s) => s.id === entry.sourceId);
      const task = tasks.find((t) => t.id === session?.taskId);
      return session && task && session.status !== "completed" ? [{ entry, session, task }] : [];
    });
  const queue = [...pending.filter((i) => !skipped.includes(i.session.id)), ...skipped.flatMap((id) => pending.filter((i) => i.session.id === id))];
  const current = queue[0];
  const next = queue[1];

  const total = current ? current.session.plannedMinutes * 60 : 0;
  const live = elapsed + (runningSince !== null ? (Date.now() - runningSince) / 1000 : 0);
  const frac = total ? Math.min(1, live / total) : 0;

  // Start from the saved whole minutes whenever a different session becomes current.
  const currentId = current?.session.id;
  useEffect(() => {
    setElapsed(current ? current.session.completedMinutes * 60 : 0);
    setRunningSince(null);
  }, [currentId]);

  // Re-render every second while running. The clock is derived from timestamps, so it does not drift.
  useEffect(() => {
    if (runningSince === null) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [runningSince]);

  const save = (s: Session, completedMinutes: number, status: Session["status"]) =>
    onProgress({ ...s, completedMinutes, status, updatedAt: new Date().toISOString(), revision: s.revision + 1 });

  // Finishing: the logical session becomes completed; the next one becomes current.
  useEffect(() => {
    if (current && runningSince !== null && live >= total) {
      setRunningSince(null);
      save(current.session, current.session.plannedMinutes, "completed");
    }
  });

  const toggle = () => {
    if (!current) return;
    const s = current.session;
    if (runningSince === null) {
      setRunningSince(Date.now());
      save(s, s.completedMinutes, "in-progress");
    } else {
      setElapsed(live);
      setRunningSince(null);
      save(s, Math.min(s.plannedMinutes, Math.floor(live / 60)), "in-progress"); // a partial session stays ONE session
    }
  };
  const skip = () => {
    if (!current || queue.length < 2) return;
    if (runningSince !== null) save(current.session, Math.min(current.session.plannedMinutes, Math.floor(live / 60)), "in-progress");
    setSkipped((ids) => [...ids.filter((id) => id !== current.session.id), current.session.id]);
  };

  const remaining = Math.max(0, Math.ceil(total - live));
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const describe = (i: Item) => (
    <>
      <strong>{i.task.title}</strong>
      <div>Session {i.session.sequence}</div>
      <div>
        {formatMinute(i.entry.startMinute)}–{formatMinute(i.entry.endMinute)} · {i.session.plannedMinutes} min planned
        {i.session.completedMinutes > 0 ? `, ${i.session.completedMinutes} done` : ""}
      </div>
    </>
  );

  return (
    <WidgetFrame title="Session" id="ses-h">
      <div className={styles.sesBoxes}>
        <div className={styles.sesBox}>
          <div className={styles.muted}>Current</div>
          {current ? describe(current) : <span className={styles.muted}>{scheduledToday.length ? "All of today's sessions are done." : "No sessions scheduled today. Place sessions on the timebox to see them here."}</span>}
        </div>
        <div className={styles.sesBox}>
          <div className={styles.muted}>Next</div>
          {next ? describe(next) : <span className={styles.muted}>None</span>}
        </div>
      </div>
      <div className={styles.sesDials}>
        <div className={styles.ring} role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={Math.max(total, 1)} aria-valuenow={Math.min(Math.max(total, 1), Math.floor(live))} aria-valuetext={`${clock} remaining`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="8" className={styles.ringTrack} />
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="8" strokeLinecap="round" className={styles.ringBar} strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
          </svg>
          <span className={styles.ringText}>{clock}</span>
        </div>
        <button className={styles.dial} onClick={toggle} disabled={!current} aria-label={runningSince === null ? "Start session" : "Pause session"}>
          {runningSince === null ? "Start" : "Pause"}
        </button>
        <button className={styles.dial} onClick={skip} disabled={queue.length < 2} aria-label="Skip to next session">Skip</button>
      </div>
    </WidgetFrame>
  );
}
