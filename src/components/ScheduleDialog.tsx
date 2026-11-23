"use client";
import { useState, type FormEvent } from "react";
import type { CalendarEvent, Session, TimeboxEntry } from "@/domain/types";
import { formatMinute } from "@/lib/dates";
import { parseTime, placementError } from "@/lib/timebox";
import Modal from "./Modal";
import styles from "./pages.module.css";

interface Props {
  target: { session: Session; title: string } | null;
  entries: TimeboxEntry[];
  events: CalendarEvent[];
  today: string;
  onClose: () => void;
  onSchedule: (entry: TimeboxEntry, session: Session) => void;
}

/** Keyboard-friendly way to place a session; the drag-and-drop timebox will use the same placementError rules. */
export default function ScheduleDialog({ target, entries, events, today, onClose, onSchedule }: Props) {
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const [error, setError] = useState("");
  const close = () => {
    setError("");
    onClose();
  };
  const start = parseTime(time);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!date || start === null) return setError("Choose a date and a start time.");
    const end = start + target.session.plannedMinutes;
    const problem = placementError({ sessionId: target.session.id, date, startMinute: start, endMinute: end }, entries, events);
    if (problem) return setError(problem);
    const at = new Date().toISOString();
    onSchedule({ id: crypto.randomUUID(), date, startMinute: start, endMinute: end, sourceType: "session", sourceId: target.session.id, manual: true, createdAt: at, updatedAt: at }, target.session);
    close();
  };

  return (
    <Modal open={target !== null} title="Schedule session" onClose={close}>
      {target && (
        <form className={styles.form} onSubmit={submit} noValidate>
          <p>{target.title}, session {target.session.sequence} ({target.session.plannedMinutes} min)</p>
          <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>
            Start time
            <input type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "sched-err" : undefined} />
          </label>
          {start !== null && start + target.session.plannedMinutes <= 1440 && <p className={styles.muted}>Ends at {formatMinute(start + target.session.plannedMinutes)}</p>}
          {error && <div id="sched-err" className={styles.err} role="alert">⚠ {error}</div>}
          <div className={styles.row}>
            <button type="submit">Schedule</button>
            <button type="button" onClick={close}>Cancel</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
