"use client";
import { useSessionTimer } from "./SessionTimerProvider";
import styles from "./SessionBar.module.css";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Says what the day-end sweep did, so sessions never seem to move on their own. */
export default function ReleasedNote() {
  const { released, dismissReleased } = useSessionTimer();
  const parts: string[] = [];
  if (released.tasks > 0) parts.push(`${plural(released.tasks, "session")} you did not get to moved back to Unscheduled`);
  if (released.projects > 0) parts.push(`${plural(released.projects, "project session")} you did not get to cleared`);
  if (parts.length === 0) return null;
  return (
    <div className={styles.note} role="status">
      <span>{parts.join(". ")}.</span>
      <button onClick={dismissReleased}>Dismiss</button>
    </div>
  );
}
