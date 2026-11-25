"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, TimeboxEntry } from "@/domain/types";
import { toDateKey } from "@/lib/dates";
import { sessionNumbers } from "@/lib/sessionNumbers";
import { idleMinutes, PAUSE_NUDGE_MINUTES, sessionCompletion } from "@/lib/sessions";
import { withMoreEstimate } from "@/lib/tasks";
import { flaggedTitle, type TitleFlag } from "@/lib/title";
import { orderQueue, QUEUE_KEY, readQueueState } from "@/lib/queue";
import { useAppData } from "./AppDataProvider";
import { useNow } from "./useNow";
import { useSessionLifecycle } from "./useSessionLifecycle";

export const EXTEND_MINUTES = 15;

/** `entry` is missing when a session was pulled in with "Next session of this task" and is not on today's timebox. */
export interface TimerItem { entry?: TimeboxEntry; session: Session; owner: { id: string; title: string } }

export interface SessionTimer {
  current?: TimerItem;
  next?: TimerItem;
  queueLength: number;
  scheduledToday: number;
  sameTaskNext?: Session;
  numbers: Map<string, number>;
  num: (s: Session) => number;
  running: boolean;
  due: boolean; // time is up: the user chooses what happens next
  paused: boolean; // paused long enough to deserve a reminder
  idle: number | null; // minutes since a started session last ran
  live: number; // seconds worked in the current session
  total: number; // seconds planned
  frac: number;
  workedNow: number; // whole minutes worked, rounded
  toggle: () => void;
  finish: () => void;
  keepWorking: () => void;
  goNextOfTask: () => void;
  skipSession: () => void;
}

const Ctx = createContext<SessionTimer | null>(null);
export function useSessionTimer(): SessionTimer {
  const value = useContext(Ctx);
  if (!value) throw new Error("useSessionTimer must be used inside SessionTimerProvider");
  return value;
}

/**
 * The session timer lives above every page, so it keeps running while you are on Tasks or Timebox and is exactly as
 * you left it when you return to Home. It saves progress every minute and ends a session that stays paused too long.
 * Limit: the running clock exists in this browser tab only. Keep Aoi open in one tab.
 */
export function SessionTimerProvider({ children }: { children: ReactNode }) {
  const app = useAppData();
  const now = useNow();
  const [skipped, setSkipped] = useState<string[]>([]); // sent to the back of today's queue, in skip order
  const [pinnedId, setPinnedId] = useState<string | null>(null); // chosen via "Next session of this task"
  const [elapsed, setElapsed] = useState(0); // seconds already worked in the current session
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const savedMin = useRef(0); // whole minutes already saved for the current session

  const sessions = app.sessions.items;
  const entries = app.timebox.items;
  const owners: { id: string; title: string }[] = [...app.tasks.items, ...app.projects.items];
  const numbers = sessionNumbers(sessions, entries, app.completions.items);
  const num = (s: Session) => numbers.get(s.id) ?? s.sequence;
  const today = toDateKey(now ?? new Date());

  const { split } = useSessionLifecycle({ ready: app.status === "ready", sessions, timebox: entries, saveSession: app.sessions.save, saveCompletion: app.completions.save });

  // Remember today's skip order and pinned session across reloads (only session ids are stored).
  const [queueLoaded, setQueueLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = readQueueState(localStorage.getItem(QUEUE_KEY), toDateKey(new Date()));
      setSkipped(saved.skipped);
      setPinnedId(saved.pinnedId);
    } catch {
      // storage unavailable: the queue simply starts fresh
    }
    setQueueLoaded(true);
  }, []);
  useEffect(() => {
    if (!queueLoaded) return;
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify({ date: toDateKey(new Date()), skipped, pinnedId }));
    } catch {
      // storage unavailable or full: skipping still works until the page is closed
    }
  }, [queueLoaded, skipped, pinnedId]);

  // Today's queue: the pinned session, then started ones, then the rest by time, then skipped ones.
  const scheduledToday = entries.filter((e) => e.date === today && e.sourceType === "session");
  const pending: TimerItem[] = [...scheduledToday]
    .sort((a, b) => a.startMinute - b.startMinute)
    .flatMap((entry) => {
      const session = sessions.find((s) => s.id === entry.sourceId);
      const owner = owners.find((o) => o.id === session?.ownerId);
      return session && owner && session.status !== "completed" ? [{ entry, session, owner }] : [];
    });
  const pinnedSession = sessions.find((s) => s.id === pinnedId && s.status !== "completed");
  const pinnedOwner = owners.find((o) => o.id === pinnedSession?.ownerId);
  const pinnedItem: TimerItem | undefined =
    pinnedSession && pinnedOwner ? { entry: scheduledToday.find((e) => e.sourceId === pinnedSession.id), session: pinnedSession, owner: pinnedOwner } : undefined;
  const queue = orderQueue(pending, skipped, pinnedItem);
  const current = queue[0];
  const next = queue[1];

  const total = current ? current.session.plannedMinutes * 60 : 0;
  const live = elapsed + (runningSince !== null ? (Date.now() - runningSince) / 1000 : 0);
  const due = Boolean(current) && total > 0 && live >= total;
  const frac = total ? Math.min(1, live / total) : 0;
  const workedNow = Math.round(live / 60);
  const running = runningSince !== null;
  const idle = current && !running ? idleMinutes(current.session, new Date()) : null;
  const paused = idle !== null && idle >= PAUSE_NUDGE_MINUTES;
  const waiting = current?.session.status === "in-progress" && !running;

  // The owner's next unfinished session by display number, even if it has no slot on today's timebox.
  const sameTaskNext = current
    ? sessions
        .filter((s) => s.ownerId === current.owner.id && s.id !== current.session.id && s.status !== "completed" && num(s) > num(current.session))
        .sort((a, b) => num(a) - num(b))[0]
    : undefined;

  const saveProgress = (s: Session, completedMinutes: number, status: Session["status"]) => {
    const at = new Date().toISOString();
    void app.sessions.save({ ...s, completedMinutes, status, lastActiveAt: at, updatedAt: at, revision: s.revision + 1 });
  };
  const complete = (s: Session, minutes: number) => {
    const at = new Date();
    void app.sessions.save({ ...s, completedMinutes: minutes, status: "completed", lastActiveAt: undefined, updatedAt: at.toISOString(), revision: s.revision + 1 });
    void app.completions.save(sessionCompletion(s.id, minutes, at)); // real time worked, for reports
  };
  /** "Keep working": the session gets longer and so does the task's estimate, because sessions add up to the task's time. */
  const extend = (s: Session, worked: number, extra: number) => {
    const at = new Date();
    void app.sessions.save({ ...s, plannedMinutes: s.plannedMinutes + extra, completedMinutes: worked, status: "in-progress", lastActiveAt: at.toISOString(), updatedAt: at.toISOString(), revision: s.revision + 1 });
    const task = s.ownerType === "task" ? app.tasks.items.find((t) => t.id === s.ownerId) : undefined;
    if (task) void app.tasks.save(withMoreEstimate(task, extra, at));
  };

  // Start from the saved whole minutes whenever a different session becomes current.
  const currentId = current?.session.id;
  useEffect(() => {
    setElapsed(current ? current.session.completedMinutes * 60 : 0);
    savedMin.current = current ? current.session.completedMinutes : 0;
    setRunningSince(null);
  }, [currentId]);

  // Re-render every second while running (the clock is derived from timestamps, so it does not drift), and every
  // 30 seconds while a started session sits paused so the reminder stays current.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [waiting]);

  // While running, save the whole minutes worked as they pass, so a closed tab loses at most a minute.
  useEffect(() => {
    if (!current || !running) return;
    const whole = Math.min(current.session.plannedMinutes, Math.floor(live / 60));
    if (whole > savedMin.current) {
      savedMin.current = whole;
      saveProgress(current.session, whole, "in-progress");
    }
  });

  // Time is up: stop the clock and save the minutes worked. The session is NOT completed until the user decides.
  useEffect(() => {
    if (current && running && live >= total) {
      setElapsed(total);
      setRunningSince(null);
      saveProgress(current.session, Math.floor(total / 60), "in-progress");
    }
  });

  // Tab title flag. It never copies the current title: it strips any flag and applies the right one, so repeats cannot pile up.
  const flag: TitleFlag | null = due ? "due" : paused ? "paused" : null;
  useEffect(() => {
    const apply = () => {
      const want = flaggedTitle(document.title, flag);
      if (document.title !== want) document.title = want;
    };
    apply();
    const observer = new MutationObserver(apply); // Next.js rewrites the title on navigation; put the flag back
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = flaggedTitle(document.title, null);
    };
  }, [flag]);

  const finish = () => {
    if (!current) return;
    // TODO(feedback): completion sound effect / animation goes here (for example a soft chime and a pulse on the ring).
    // Check the reduced-motion preference and a future "sound effects" setting before playing or animating anything.
    complete(current.session, workedNow);
    setRunningSince(null);
  };
  const keepWorking = () => {
    if (!current) return;
    extend(current.session, Math.floor(live / 60), EXTEND_MINUTES);
    setRunningSince(Date.now());
  };
  const goNextOfTask = () => {
    if (!sameTaskNext) return;
    finish();
    setPinnedId(sameTaskNext.id);
  };
  const toggle = () => {
    if (!current) return;
    const s = current.session;
    if (!running) {
      savedMin.current = Math.floor(elapsed / 60);
      setRunningSince(Date.now());
      saveProgress(s, s.completedMinutes, "in-progress");
    } else {
      setElapsed(live);
      setRunningSince(null);
      saveProgress(s, Math.min(s.plannedMinutes, Math.floor(live / 60)), "in-progress"); // a pause is a break: still the same session
    }
  };
  const skipSession = () => {
    if (!current) return;
    setRunningSince(null);
    if (workedNow > 0) {
      split(current.session, Math.min(current.session.plannedMinutes, workedNow)); // worked on, so the worked part is its own session
      return;
    }
    if (current.session.status === "in-progress") {
      // Started but nothing worked: put it back where it was, so it does not look started after a reload.
      const placed = entries.some((e) => e.sourceType === "session" && e.sourceId === current.session.id);
      void app.sessions.save({ ...current.session, status: placed ? "scheduled" : "unscheduled", lastActiveAt: undefined, updatedAt: new Date().toISOString(), revision: current.session.revision + 1 });
    }
    if (queue.length < 2) return;
    if (current.session.id === pinnedSession?.id) setPinnedId(null);
    else setSkipped((ids) => [...ids.filter((id) => id !== current.session.id), current.session.id]);
  };

  const value: SessionTimer = {
    current, next, queueLength: queue.length, scheduledToday: scheduledToday.length, sameTaskNext, numbers, num,
    running, due, paused, idle, live, total, frac, workedNow, toggle, finish, keepWorking, goNextOfTask, skipSession,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
