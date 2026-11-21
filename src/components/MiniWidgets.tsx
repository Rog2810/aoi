"use client";
import { CATEGORIES, UNCATEGORIZED } from "@/config/categories";
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

const cards = (items: string[]) => (
  <div className={styles.cardGrid}>
    {items.map((i) => <div key={i} className={styles.card}>{i}</div>)}
  </div>
);

export function DailyWeeklyWidget() {
  return (
    <WidgetFrame title="Daily and weekly" id="dw-h">
      <TabControl
        label="Daily or weekly missions"
        tabs={[
          { id: "daily", label: "Daily", content: cards(["Complete one work session", "Check tomorrow's deadlines", "Log today's study time", "Plan one session for tomorrow"]) },
          { id: "weekly", label: "Weekly", content: cards(["Finish one subtask ahead of its due date", "Review next week's deadlines", "Clear one overdue task"]) },
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
        {[...CATEGORIES, UNCATEGORIZED].map((c) => (
          <li key={c.id}><span className={styles.sw} style={{ background: c.color }} />{c.name}</li>
        ))}
      </ul>
      <p className={styles.muted}>A line runs from each task's start date to its due date.</p>
    </WidgetFrame>
  );
}
