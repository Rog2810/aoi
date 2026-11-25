"use client";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/config/app";
import type { TaskStatus } from "@/domain/types";
import type { WeekStart } from "@/lib/calendar";
import { toDateKey } from "@/lib/dates";
import { sessionNumbers } from "@/lib/sessionNumbers";
import { taskCompletion, withStatus } from "@/lib/tasks";
import { useAppData } from "./AppDataProvider";
import CalendarWidget from "./CalendarWidget";
import { DailyWeeklyWidget, LegendWidget, RemindersWidget } from "./MiniWidgets";
import Nav from "./Nav";
import SessionManagerWidget from "./SessionManagerWidget";
import TasksEventsWidget from "./TasksEventsWidget";
import TimeboxWidget from "./TimeboxWidget";
import styles from "./Dashboard.module.css";

/** Date/locale are read after mount so server and browser output cannot disagree (hydration). */
export default function Dashboard() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now ? <Board now={now} /> : <p role="status">Loading…</p>;
}

/** Reads the shared app data, so any number of widgets (even duplicates) see the same records. */
function Board({ now }: { now: Date }) {
  const weekStart: WeekStart = 1; // TODO(settings): read Monday/Sunday from the preferences repository
  const [activeTask, setActiveTask] = useState<string | null>(null); // hovered task, shared by the calendar and the task list
  const app = useAppData();
  if (app.status === "loading") return <p role="status">Loading…</p>;

  const tasks = app.tasks.items;
  const projects = app.projects.items;
  const sessions = app.sessions.items;
  const timebox = app.timebox.items;
  const reminders = app.reminders.items;
  const numbers = sessionNumbers(sessions, timebox, app.completions.items);

  const setStatus = (id: string, status: TaskStatus) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const at = new Date();
    void app.tasks.save(withStatus(t, status, at));
    if (status === "completed") void app.completions.save(taskCompletion(t.id, at));
    else if (t.status === "completed") app.completions.items.filter((r) => r.sourceType === "task" && r.sourceId === t.id && r.localDate === toDateKey(at)).forEach((r) => void app.completions.remove(r.id));
  };
  const markDone = (id: string) => {
    const r = reminders.find((x) => x.id === id);
    if (r) void app.reminders.save({ ...r, lastCompletedDate: toDateKey(new Date()), updatedAt: new Date().toISOString(), revision: r.revision + 1 });
  };

  return (
    <div className={styles.shell}>
      {app.status === "error" && (
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
        <div className={`${styles.aTasks} ${styles.fill}`}><TasksEventsWidget tasks={tasks} events={app.events} now={now} onStatus={setStatus} activeTaskId={activeTask} onActiveTask={setActiveTask} /></div>
        <div className={styles.aTime}><TimeboxWidget now={now} events={app.events} entries={timebox} sessions={sessions} tasks={tasks} projects={projects} numbers={numbers} /></div>
        <div className={`${styles.aRem}`}><RemindersWidget reminders={reminders} now={now} onDone={markDone} /></div>
        <div className={`${styles.aDw}`}><DailyWeeklyWidget /></div>
        <div className={`${styles.aSes}`}><SessionManagerWidget /></div>
      </div>
    </div>
  );
}
