"use client";
import type { Reminder, Session, SessionStatus, Task } from "@/domain/types";
import { daysRemaining } from "@/lib/dates";
import { remainingMinutes } from "@/lib/sessions";
import TabControl from "./TabControl";
import WidgetFrame from "./WidgetFrame";
import styles from "./Dashboard.module.css";

/** Horizontal rail; the region is focusable so keyboard users can scroll it with the arrow keys. */
export function RemindersWidget({ reminders, now, onDone }: { reminders: Reminder[]; now: Date; onDone: (id: string) => void }) {
  return (
    <WidgetFrame title="Reminders" id="rem-h" wide>
      <div className={styles.rail} role="region" aria-label="Reminders, scrolls sideways" tabIndex={0}>
        {reminders.map((r) => {
          const since = -daysRemaining(r.lastCompletedDate, now);
          return (
            <article key={r.id} className={styles.remCard}>
              <h3>{r.title}</h3>
              <p>{since === 0 ? "Done today" : `${since} day${since === 1 ? "" : "s"} since last done`}</p>
              <button onClick={() => onDone(r.id)} aria-label={`Mark ${r.title} done`}>Done</button>
            </article>
          );
        })}
      </div>
    </WidgetFrame>
  );
}

const STATUS: Record<SessionStatus, string> = { unscheduled: "Unscheduled", scheduled: "Scheduled", "in-progress": "In progress", completed: "Completed" };

export function SessionsWidget({ sessions, tasks }: { sessions: Session[]; tasks: Task[] }) {
  const groups = tasks.map((t) => ({ t, ss: sessions.filter((s) => s.taskId === t.id) })).filter((g) => g.ss.length > 0);
  return (
    <WidgetFrame title="Sessions" id="ses-h">
      {groups.map(({ t, ss }) => (
        <div key={t.id}>
          <h3 className={styles.h3}>{t.title}: {ss.filter((s) => s.status === "completed").length} of {ss.length} sessions done</h3>
          <ul className={styles.tasks}>
            {ss.map((s) => (
              <li key={s.id} className={styles.task}>
                <span>Session {s.sequence}</span>
                <span>{s.plannedMinutes} min planned · {s.completedMinutes} done · {remainingMinutes(s)} left · {STATUS[s.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </WidgetFrame>
  );
}

const list = (items: string[]) => <ul className={styles.plain}>{items.map((i) => <li key={i}>{i}</li>)}</ul>;

export function DailyWeeklyWidget() {
  return (
    <WidgetFrame title="Daily and weekly" id="dw-h">
      <TabControl
        label="Daily or weekly missions"
        tabs={[
          { id: "daily", label: "Daily", content: list(["Complete one work session", "Check tomorrow's deadlines"]) },
          { id: "weekly", label: "Weekly", content: list(["Finish one subtask ahead of its due date"]) },
        ]}
      />
      <p className={styles.muted}>Sample missions. Random selection and weekly themes are not built yet.</p>
    </WidgetFrame>
  );
}

export function LegendWidget() {
  return (
    <WidgetFrame title="Legend" id="leg-h">
      <ul className={styles.legend}>
        <li>• Task due on that day (calendar)</li>
        <li><span className={`${styles.sw} ${styles.swToday}`} />Today</li>
        <li><span className={`${styles.sw} ${styles.swSel}`} />Selected day</li>
        <li><span className={`${styles.sw} ${styles.swEvent}`} />Event (thick left edge)</li>
        <li><span className={`${styles.sw} ${styles.swSession}`} />Session (dashed outline)</li>
      </ul>
    </WidgetFrame>
  );
}
