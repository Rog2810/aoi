"use client";
import type { CalendarEvent, Task, TaskStatus } from "@/domain/types";
import { daysRemaining, describeRemaining, formatDueDate, formatMinute } from "@/lib/dates";
import TabControl from "./TabControl";
import WidgetFrame from "./WidgetFrame";
import styles from "./Dashboard.module.css";

interface Props { tasks: Task[]; events: CalendarEvent[]; now: Date; onStatus: (id: string, s: TaskStatus) => void }

export default function TasksEventsWidget({ tasks, events, now, onStatus }: Props) {
  const active = tasks.filter((t) => t.status !== "completed").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const done = tasks.filter((t) => t.status === "completed");

  const taskPanel = (
    <>
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
              <button onClick={() => onStatus(t.id, "completed")} aria-label={`Complete ${t.title}`}>Complete</button>
            </li>
          );
        })}
      </ul>
      {done.length > 0 && (
        <>
          <h3 className={styles.h3}>Completed today</h3>
          <ul className={styles.tasks}>
            {done.map((t) => (
              <li key={t.id} className={styles.task}>
                <span className={styles.title}>{t.title}</span>
                <button onClick={() => onStatus(t.id, "not-started")} aria-label={`Undo completion of ${t.title}`}>Undo</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );

  const eventPanel = (
    <ul className={styles.tasks}>
      {events.map((e) => (
        <li key={e.id} className={styles.task}>
          <div>
            <div className={styles.title}>{e.title}</div>
            <div>{formatDueDate(e.date)} · {formatMinute(e.startMinute)}–{formatMinute(e.endMinute)}</div>
            <div className={styles.muted}>
              {e.recurrence === "never" ? "Does not repeat" : `Repeats ${e.recurrence}`} · {e.overlapPolicy === "exclusive" ? "Exclusive" : "Allows parallel work"}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <WidgetFrame title="Tasks and events" id="task-h">
      <TabControl label="Tasks or events" tabs={[{ id: "tasks", label: "Tasks", content: taskPanel }, { id: "events", label: "Events", content: eventPanel }]} />
    </WidgetFrame>
  );
}
