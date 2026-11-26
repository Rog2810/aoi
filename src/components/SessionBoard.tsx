"use client";
import { useState } from "react";
import { CATEGORIES } from "@/config/categories";
import type { Project, Session } from "@/domain/types";
import { addDays, daysRemaining, describeRemaining, formatDueDate, formatMinute, toDateKey } from "@/lib/dates";
import { buildProject, formatDuration, minutesThisWeek, PROJECT_SESSION_MINUTES } from "@/lib/projects";
import { groupSessions, segmentsFor, type SessionColumn, type SessionGroup } from "@/lib/sessionBoard";
import { sessionNumbers, settledCount } from "@/lib/sessionNumbers";
import { newSession, remainingMinutes, spentOn } from "@/lib/sessions";
import MarqueeText from "./MarqueeText";
import NewProjectDialog from "./NewProjectDialog";
import NewSessionDialog from "./NewSessionDialog";
import ScheduleDialog from "./ScheduleDialog";
import SessionStack, { type StackItem } from "./SessionStack";
import TimeProgress from "./TimeProgress";
import { useNow } from "./useNow";
import { useTaskData } from "./useTaskData";
import styles from "./pages.module.css";
import IconButton from "./IconButton";
import { CalendarIcon, ReturnIcon } from "./icons";

const COLUMNS: { id: SessionColumn; title: string }[] = [
  { id: "unscheduled", title: "Unscheduled" },
  { id: "scheduled", title: "Scheduled" },
  { id: "projects", title: "Projects" },
];
const WEEK_START = 1 as const; // TODO(settings): read Monday/Sunday from the preferences repository
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function SessionBoard() {
  const now = useNow();
  return now ? <Board now={now} /> : <p role="status">Loading…</p>;
}

function Board({ now }: { now: Date }) {
  const d = useTaskData();
  const [target, setTarget] = useState<{ session: Session; title: string } | null>(null);
  const [addingSession, setAddingSession] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  if (d.status === "loading") return <p role="status">Loading…</p>;

  const today = toDateKey(now);
  const groups = groupSessions(d.tasks, d.projects, d.sessions, d.timebox);
  const numbers = sessionNumbers(d.sessions, d.timebox, d.completions);
  const numOf = (s: Session) => numbers.get(s.id) ?? s.sequence;
  const openTasks = d.tasks.filter((t) => t.status === "not-started" || t.status === "in-progress");
  const firstSlot = (id: string) =>
    d.timebox.filter((e) => e.sourceType === "session" && e.sourceId === id).sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute)[0];

  const slotLabel = (date: string, start: number, end: number) => {
    const [y, m, day] = date.split("-").map(Number);
    const name = date === today ? "Today" : date === addDays(today, 1) ? "Tomorrow" : new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(y, m - 1, day));
    return `${name} ${formatMinute(start)}–${formatMinute(end)}`;
  };

  /** One session card. Each text line stays on one line because the card has a fixed height; the full text is in the tooltip. */
  const itemFor = (s: Session, title: string, i: number): StackItem => {
    const slot = firstSlot(s.id);
    const label = `${title}, session ${numOf(s)}`;
    const head = `${s.plannedMinutes} min${slot ? " planned" : ""}`;
    const progress = s.completedMinutes > 0 ? `${s.completedMinutes} done · ${remainingMinutes(s)} left` : null;
    const when = slot ? slotLabel(slot.date, slot.startMinute, slot.endMinute) : `${i === 0 ? "Next · " : ""}Not scheduled`;
    return {
      id: s.id,
      grip: true,
      tip: [`Session ${numOf(s)} · ${head}`, progress, when].filter(Boolean).join("\n"),
      text: (
        <>
          <span className={styles.ln}><strong>Session {numOf(s)}</strong> · {head}</span>
          {progress && <span className={`${styles.ln} ${styles.muted}`}>{progress}</span>}
          <span className={`${styles.ln} ${styles.muted}`}>{when}</span>
        </>
      ),
      action: slot ? (
        s.status !== "in-progress" ? <IconButton label={`Unschedule ${label}`} onClick={() => d.unscheduleSession(s)}><ReturnIcon /></IconButton> : null
      ) : (
        <IconButton label={`Schedule ${label}`} onClick={() => setTarget({ session: s, title: label })}><CalendarIcon /></IconButton>
      ),
    };
  };

  /** A project's single waiting card. It is not stored: scheduling it creates the real session, and unscheduling deletes it. */
  const projectTop = (p: Project): StackItem => {
    const n = settledCount(p.id, d.sessions, d.timebox, d.completions) + 1;
    const label = `${p.title}, session ${n}`;
    return {
      id: `next-${p.id}`,
      grip: true,
      tip: `Session ${n} · ${PROJECT_SESSION_MINUTES} min\nNext · Not scheduled`,
      text: (
        <>
          <span className={styles.ln}><strong>Session {n}</strong> · {PROJECT_SESSION_MINUTES} min</span>
          <span className={`${styles.ln} ${styles.muted}`}>Next · Not scheduled</span>
        </>
      ),
      action: (
        <IconButton label={`Schedule ${label}`} onClick={() => setTarget({ session: newSession("project", p.id, d.sessions, PROJECT_SESSION_MINUTES, new Date()), title: label })}>
          <CalendarIcon />
        </IconButton>
      ),
    };
  };

  const card = (col: SessionColumn) => (g: SessionGroup) => {
    const owner = g.kind === "task" ? g.task : g.project;
    const cats = CATEGORIES.filter((c) => owner.categoryIds.includes(c.id));
    const tall = g.sessions.some((s) => s.completedMinutes > 0);
    const stack = g.sessions.length > 0 && <SessionStack items={g.sessions.map((s, i) => itemFor(s, owner.title, i))} height={tall ? 76 : 64} />;
    const chips = cats.length > 0 && (
      <div className={styles.chips}>
        {cats.map((c) => <span key={c.id} className={styles.chip}><span className={styles.swatch} style={{ background: c.color }} aria-hidden="true" />{c.name}</span>)}
      </div>
    );

    if (g.kind === "project") {
      if (col === "scheduled") {
        return (
          <li key={owner.id} className={styles.card} data-marquee-host>
            <MarqueeText className={styles.cardTitle}>{owner.title}</MarqueeText>
            <div className={styles.muted}>Project</div>
            {stack}
          </li>
        );
      }
      const worked = spentOn(owner.id, d.sessions);
      const open = d.tasks.filter((t) => t.projectId === owner.id && (t.status === "not-started" || t.status === "in-progress")).length;
      const goal = g.project.weeklyTargetMinutes;
      const week = goal ? minutesThisWeek(owner.id, d.sessions, d.completions, today, WEEK_START) : 0;
      return (
        <li key={owner.id} className={styles.card} data-marquee-host>
          <MarqueeText className={styles.cardTitle}>{owner.title}</MarqueeText>
          <div className={styles.muted}>{g.project.status === "paused" ? "Paused · " : ""}{plural(open, "open task")} · {worked} min worked</div>
          {goal ? (
            <div>
              <progress className={styles.weekly} value={Math.min(week, goal)} max={goal} aria-label={`Weekly target for ${owner.title}`} aria-valuetext={`${formatDuration(week)} of ${formatDuration(goal)} this week`} />
              <div className={styles.muted}>{formatDuration(week)} of {formatDuration(goal)} this week</div>
            </div>
          ) : null}
          {chips}
          {g.project.status === "active" ? <SessionStack items={[projectTop(g.project)]} /> : <p className={styles.muted}>Paused. Resume it to plan sessions.</p>}
        </li>
      );
    }

    const segs = segmentsFor(d.sessions, owner.id);
    const finished = segs.filter((x) => x === "done").length;
    const started = segs.filter((x) => x === "half").length;
    const parent = d.tasks.find((p) => p.id === g.task.parentId);
    const project = d.projects.find((p) => p.id === g.task.projectId);
    return (
      <li key={owner.id} className={styles.card} data-marquee-host>
        <MarqueeText className={styles.cardTitle}>{owner.title}</MarqueeText>
        {parent && <div className={styles.muted}>Subtask of {parent.title}</div>}
        {project && <div className={styles.muted}>Project: {project.title}</div>}
        <div>{formatDueDate(g.task.dueDate)}</div>
        <div><strong>{describeRemaining(daysRemaining(g.task.dueDate, now))}</strong></div>
        {chips}
        <div className={styles.strip}>
          <span className={styles.segs} role="img" aria-label={`${finished} of ${segs.length} sessions done${started ? `, ${started} in progress` : ""}`}>
            {segs.map((x, i) => <span key={i} className={x === "done" ? `${styles.seg} ${styles.segDone}` : x === "half" ? `${styles.seg} ${styles.segHalf}` : styles.seg} />)}
          </span>
          <span className={styles.muted}>{finished} of {segs.length} sessions done</span>
        </div>
        <TimeProgress spent={spentOn(owner.id, d.sessions)} estimate={g.task.estimateMinutes} label={`Time spent on ${owner.title}`} />
        {stack}
      </li>
    );
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
              const isProjects = col.id === "projects";
              const count = isProjects ? list.length : list.reduce((n, g) => n + g.sessions.length, 0);
              return (
                <section key={col.id} className={styles.column} aria-labelledby={`scol-${col.id}`}>
                  <div className={styles.colHead}>
                    <h3 id={`scol-${col.id}`} className={styles.colTitle}>{col.title} <span className={styles.count}>({plural(count, isProjects ? "project" : "session")})</span></h3>
                    {col.id === "unscheduled" && <button onClick={() => setAddingSession(true)}>New session</button>}
                    {isProjects && <button onClick={() => setAddingProject(true)}>New project</button>}
                  </div>
                  {list.length === 0 ? <p className={styles.muted}>Nothing here.</p> : <ul className={styles.cards2}>{list.map(card(col.id))}</ul>}
                </section>
              );
            })}
          </div>
        </section>

        {/* Placeholder: the editable timebox (drag, move, resize, five-minute snapping) replaces this box later.
            Completed sessions will show there in green with a check mark, like Home's timebox already does. */}
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
      <NewSessionDialog open={addingSession} onClose={() => setAddingSession(false)} tasks={openTasks} onCreate={d.createSession} />
      <NewProjectDialog open={addingProject} onClose={() => setAddingProject(false)} onCreate={(input) => d.addProject(buildProject(input, new Date()))} />
    </>
  );
}
