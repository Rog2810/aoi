"use client";
import { useEffect, useMemo, useState } from "react";
import { APP_NAME } from "@/config/app";
import { getRepositories } from "@/db/db";
import type { TaskStatus } from "@/domain/types";
import { sampleData } from "@/fixtures/sample";
import type { WeekStart } from "@/lib/calendar";
import { toDateKey } from "@/lib/dates";
import CalendarWidget from "./CalendarWidget";
import { DailyWeeklyWidget, LegendWidget, RemindersWidget, SessionsWidget } from "./MiniWidgets";
import Nav from "./Nav";
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
  const repos = getRepositories();
  const { items: tasks, status: taskState, save: saveTask } = usePersistentRecords(repos.tasks, () => data.tasks);
  const { items: reminders, status: reminderState, save: saveReminder } = usePersistentRecords(repos.reminders, () => data.reminders);

  if (taskState === "loading" || reminderState === "loading") return <p role="status">Loading…</p>;

  const setStatus = (id: string, status: TaskStatus) => {
    const t = tasks.find((x) => x.id === id);
    if (t) void saveTask({ ...t, status, updatedAt: new Date().toISOString(), revision: t.revision + 1 });
  };
  const markDone = (id: string) => {
    const r = reminders.find((x) => x.id === id);
    if (r) void saveReminder({ ...r, lastCompletedDate: toDateKey(new Date()), updatedAt: new Date().toISOString(), revision: r.revision + 1 });
  };

  return (
    <>
      {(taskState === "error" || reminderState === "error") && (
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
        <div className={styles.aCal}><CalendarWidget now={now} tasks={tasks} weekStart={weekStart} /></div>
        <div className={styles.aLeg}><LegendWidget /></div>
        <div className={`${styles.aTasks} ${styles.fill}`}><TasksEventsWidget tasks={tasks} events={data.events} now={now} onStatus={setStatus} /></div>
        <div className={styles.aTime}><TimeboxWidget now={now} events={data.events} entries={data.timebox} sessions={data.sessions} tasks={tasks} /></div>
        <div className={`${styles.aRem} ${styles.capped}`}><RemindersWidget reminders={reminders} now={now} onDone={markDone} /></div>
        <div className={`${styles.aDw} ${styles.capped}`}><DailyWeeklyWidget /></div>
        <div className={`${styles.aSes} ${styles.capped}`}><SessionsWidget sessions={data.sessions} tasks={tasks} /></div>
      </div>
    </>
  );
}
