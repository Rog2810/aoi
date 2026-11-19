"use client";
import { useEffect, useMemo, useState } from "react";
import type { TaskStatus } from "@/domain/types";
import { sampleData } from "@/fixtures/sample";
import { toDateKey } from "@/lib/dates";
import CalendarWidget from "./CalendarWidget";
import { DailyWeeklyWidget, LegendWidget, RemindersWidget, SessionsWidget } from "./MiniWidgets";
import TasksEventsWidget from "./TasksEventsWidget";
import TimeboxWidget from "./TimeboxWidget";
import styles from "./Dashboard.module.css";

/** Date/locale are read after mount so server and browser output cannot disagree (hydration). */
export default function Dashboard() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now ? <Board now={now} /> : <p role="status">Loading…</p>;
}

/** Owns the shared data once, so any number of widgets (even duplicates) see the same records. */
function Board({ now }: { now: Date }) {
  const data = useMemo(() => sampleData(now), [now]);
  const [tasks, setTasks] = useState(data.tasks);
  const [reminders, setReminders] = useState(data.reminders);

  const setStatus = (id: string, status: TaskStatus) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date().toISOString(), revision: t.revision + 1 } : t)));
  const markDone = (id: string) =>
    setReminders((rs) => rs.map((r) => (r.id === id ? { ...r, lastCompletedDate: toDateKey(new Date()), updatedAt: new Date().toISOString(), revision: r.revision + 1 } : r)));

  return (
    <div className={styles.grid}>
      <CalendarWidget now={now} tasks={tasks} />
      <TimeboxWidget now={now} events={data.events} entries={data.timebox} sessions={data.sessions} tasks={tasks} />
      <TasksEventsWidget tasks={tasks} events={data.events} now={now} onStatus={setStatus} />
      <SessionsWidget sessions={data.sessions} tasks={tasks} />
      <DailyWeeklyWidget />
      <LegendWidget />
      <RemindersWidget reminders={reminders} now={now} onDone={markDone} />
    </div>
  );
}
