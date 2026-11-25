"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getRepositories } from "@/db/db";
import type { CalendarEvent, CompletionRecord, Project, Reminder, Session, Task, TimeboxEntry } from "@/domain/types";
import { sampleData } from "@/fixtures/sample";
import { usePersistentRecords, type StorageStatus } from "./usePersistentRecords";

export interface Store<T> {
  items: T[];
  status: StorageStatus;
  save: (item: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
}
export interface AppData {
  status: StorageStatus;
  tasks: Store<Task>;
  projects: Store<Project>;
  sessions: Store<Session>;
  completions: Store<CompletionRecord>;
  timebox: Store<TimeboxEntry>;
  reminders: Store<Reminder>;
  events: CalendarEvent[]; // sample data until the Events page persists them
}

const empty = <T,>(): Store<T> => ({ items: [], status: "loading", save: async () => undefined, remove: async () => undefined });
const LOADING: AppData = { status: "loading", tasks: empty(), projects: empty(), sessions: empty(), completions: empty(), timebox: empty(), reminders: empty(), events: [] };
const Ctx = createContext<AppData | null>(null);

/** Everything a page needs lives here, so pages share one copy and background work (the session timer) cannot go stale. */
function Loaded({ children }: { children: ReactNode }) {
  const repos = getRepositories();
  const seed = useMemo(() => sampleData(new Date()), []);
  const tasks = usePersistentRecords(repos.tasks, () => seed.tasks);
  const projects = usePersistentRecords(repos.projects, () => seed.projects);
  const sessions = usePersistentRecords(repos.sessions, () => seed.sessions);
  const completions = usePersistentRecords(repos.completions, () => []);
  const timebox = usePersistentRecords(repos.timebox, () => seed.timebox);
  const reminders = usePersistentRecords(repos.reminders, () => seed.reminders);
  const states = [tasks.status, projects.status, sessions.status, completions.status, timebox.status, reminders.status];
  const status: StorageStatus = states.includes("loading") ? "loading" : states.includes("error") ? "error" : "ready";
  return <Ctx.Provider value={{ status, tasks, projects, sessions, completions, timebox, reminders, events: seed.events }}>{children}</Ctx.Provider>;
}

/** The database is only touched in the browser, so the first (server-rendered) pass shows the loading state. */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Loaded>{children}</Loaded> : <Ctx.Provider value={LOADING}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}
