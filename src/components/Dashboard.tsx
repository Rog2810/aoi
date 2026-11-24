"use client";
import { useEffect, useMemo, useState } from "react";
import { APP_NAME } from "@/config/app";
import { getRepositories } from "@/db/db";
import type { Session, TaskStatus } from "@/domain/types";
import { sampleData } from "@/fixtures/sample";
import type { WeekStart } from "@/lib/calendar";
import { toDateKey } from "@/lib/dates";
import { taskCompletion, withStatus, withMoreEstimate } from "@/lib/tasks";
import { sessionNumbers } from "@/lib/sessionNumbers";
import { useSessionLifecycle } from "./useSessionLifecycle";
import CalendarWidget from "./CalendarWidget";
import { DailyWeeklyWidget, LegendWidget, RemindersWidget } from "./MiniWidgets";
import Nav from "./Nav";
import SessionManagerWidget from "./SessionManagerWidget";
import TasksEventsWidget from "./TasksEventsWidget";
import TimeboxWidget from "./TimeboxWidget";
import { usePersistentRecords } from "./usePersistentRecords";
import styles from "./Dashboard.module.css";

/** Date/locale are read after mount so server and browser output cannot disagree (hydration). */
export default function Dashboard() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now ? <Board now={now} /> : <p role="status">Loading…</p>;
}

/** Owns the shared data once, so any number of widgets (even duplicates) see the same records. */
function Board({ now }: { now: Date }) {
  const weekStart: WeekStart = 1; // TODO(settings): read Monday/Sunday from the preferences repository
  const data = useMemo(() => sampleData(now), [now]);
  const [activeTask, setActiveTask] = useState<string | null>(null); // hovered task, shared by the calendar and the task list
  const repos = getRepositories();
  const { items: tasks, status: taskState, save: saveTask } = usePersistentRecords(repos.tasks, () => data.tasks);
  const { items: reminders, status: reminderState, save: saveReminder } = usePersistentRecords(repos.reminders, () => data.reminders);
  const { items: sessions, status: sessionState, save: saveSession } = usePersistentRecords(repos.sessions, () => data.sessions);
  const { items: timebox, status: timeboxState } = usePersistentRecords(repos.timebox, () => data.timebox);
  const { items: projects, status: projectState } = usePersistentRecords(repos.projects, () => data.projects);
  const { items: completions, status: completionState, save: saveCompletion, remove: removeCompletion } = usePersistentRecords(repos.completions, () => []);
  const states = [taskState, reminderState, sessionState, completionState, timeboxState, projectState];
  const { split } = useSessionLifecycle({ ready: !states.includes("loading"), sessions, timebox, saveSession, saveCompletion });

  if (states.includes("loading")) return <p role="status">Loading…</p>;

  const numbers = sessionNumbers(sessions, timebox, completions);

  const setStatus = (id: string, status: TaskStatus) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const at = new Date();
    void saveTask(withStatus(t, status, at));
    if (status === "completed") void saveCompletion(taskCompletion(t.id, at));
    else if (t.status === "completed") completions.filter((r) => r.sourceType === "task" && r.sourceId === t.id && r.localDate === toDateKey(at)).forEach((r) => void removeCompletion(r.id));
  };
  const markDone = (id: string) => {
    const r = reminders.find((x) => x.id === id);
    if (r) void saveReminder({ ...r, lastCompletedDate: toDateKey(new Date()), updatedAt: new Date().toISOString(), revision: r.revision + 1 });
  };
  /** Marks the session completed and records the REAL minutes worked for task reports (not the planned length). */
  const completeSession = (s: Session, minutesSpent: number) => {
    const at = new Date();
    void saveSession({ ...s, completedMinutes: minutesSpent, status: "completed", updatedAt: at.toISOString(), revision: s.revision + 1 });
    void saveCompletion({
      id: crypto.randomUUID(),
      sourceId: s.id,
      sourceType: "session",
      completedAt: at.toISOString(),
      localDate: toDateKey(at),
      minutesSpent,
      retroactive: false,
      createdAt: at.toISOString(),
    });
  };
  /** "Keep working": the session gets longer, and so does the task's estimate, because sessions add up to the task's time. */
  const extendSession = (s: Session, workedMinutes: number, extra: number) => {
    const at = new Date();
    void saveSession({ ...s, plannedMinutes: s.plannedMinutes + extra, completedMinutes: workedMinutes, status: "in-progress", lastActiveAt: at.toISOString(), updatedAt: at.toISOString(), revision: s.revision + 1 });
    const task = s.ownerType === "task" ? tasks.find((t) => t.id === s.ownerId) : undefined;
    if (task) void saveTask(withMoreEstimate(task, extra, at));
  };

  return (
    <div className={styles.shell}>
      {states.includes("error") && (
        <p role="alert" className={styles.error}>
          Changes could not be saved on this device. Aoi is running from memory, so anything you change will be lost when you close this tab.
        </p>
      )}
      <div className={styles.home}>
        <div className={styles.aMenu}>
          <div className={styles.bar}>
            <h1 className={styles.brand}>{APP_NAME}</h1>
            <Nav />
          </div>
        </div>
        <div className={styles.aCal}><CalendarWidget now={now} tasks={tasks} weekStart={weekStart} activeTaskId={activeTask} onActiveTask={setActiveTask} /></div>
        <div className={styles.aLeg}><LegendWidget /></div>
        <div className={`${styles.aTasks} ${styles.fill}`}><TasksEventsWidget tasks={tasks} events={data.events} now={now} onStatus={setStatus} activeTaskId={activeTask} onActiveTask={setActiveTask} /></div>
        <div className={styles.aTime}><TimeboxWidget now={now} events={data.events} entries={data.timebox} sessions={sessions} tasks={tasks} projects={projects} numbers={numbers} /></div>
        <div className={`${styles.aRem}`}><RemindersWidget reminders={reminders} now={now} onDone={markDone} /></div>
        <div className={`${styles.aDw}`}><DailyWeeklyWidget /></div>
        <div className={`${styles.aSes}`}><SessionManagerWidget entries={timebox} sessions={sessions} tasks={[...tasks, ...projects]} numbers={numbers} onProgress={(s) => void saveSession(s)} onComplete={completeSession} onSplit={split} onExtend={extendSession} /></div>
      </div>
    </div>
  );
}
