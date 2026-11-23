"use client";
import { CATEGORIES } from "@/config/categories";
import { TAGS } from "@/config/tags";
import type { Project, Task, TaskStatus } from "@/domain/types";
import { daysRemaining, describeRemaining, formatDueDate, formatMinute } from "@/lib/dates";
import type { Column } from "@/lib/tasks";
import MarqueeText from "./MarqueeText";
import styles from "./pages.module.css";

const STATUS: Record<TaskStatus, string> = { "not-started": "Not started", "in-progress": "In progress", completed: "Completed", cancelled: "Cancelled" };
interface Props { task: Task; parent?: Task; project?: Project; progress: { total: number; done: number }; now: Date; column: Column; onStatus: (s: TaskStatus) => void }

export default function TaskCard({ task, parent, project, progress, now, column, onStatus }: Props) {
  const [h, m] = (task.dueTime ?? "").split(":").map(Number);
  const time = task.dueTime ? formatMinute(h * 60 + m) : "";
  const cats = CATEGORIES.filter((c) => task.categoryIds.includes(c.id));
  const tags = TAGS.filter((t) => task.tagIds.includes(t.id));
  const complete = <button onClick={() => onStatus("completed")} aria-label={`Complete ${task.title}`}>Complete</button>;

  return (
    <li className={styles.card} data-marquee-host data-task-id={task.id}>
      <MarqueeText className={styles.cardTitle}>{task.title}</MarqueeText>
      {parent && <div className={styles.muted}>Subtask of {parent.title}</div>}
            {project && <div className={styles.muted}>Project: {project.title}</div>}
      <div>{formatDueDate(task.dueDate)}{time && `, ${time}`}</div>
      <div><strong>{describeRemaining(daysRemaining(task.dueDate, now))}</strong></div>
      <div className={styles.muted}>{task.estimateMinutes} min estimated · {progress.total ? `${progress.done} of ${progress.total} sessions done` : "No sessions"}</div>
      {(cats.length > 0 || tags.length > 0) && (
        <div className={styles.chips}>
          {cats.map((c) => <span key={c.id} className={styles.chip}><span className={styles.swatch} style={{ background: c.color }} aria-hidden="true" />{c.name}</span>)}
          {tags.map((t) => <span key={t.id} className={styles.chip}>#{t.name}</span>)}
        </div>
      )}
      <div className={styles.muted}>Status: {STATUS[task.status]}</div>
      <div className={styles.actions}>
        {column === "not-started" && <><button onClick={() => onStatus("in-progress")} aria-label={`Start ${task.title}`}>Start</button>{complete}</>}
        {column === "in-progress" && <><button onClick={() => onStatus("not-started")} aria-label={`Move ${task.title} back to Not Started`}>Back to Not Started</button>{complete}</>}
        {column === "completed-today" && <button onClick={() => onStatus("not-started")} aria-label={`Undo completion of ${task.title}`}>Undo completion</button>}
      </div>
    </li>
  );
}
