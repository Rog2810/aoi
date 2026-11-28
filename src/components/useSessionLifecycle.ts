"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@/domain/types";
import { missedRecord, recentlyActive, sessionsToRelease } from "@/lib/missed";
import { idleMinutes, PAUSE_LIMIT_MINUTES, sessionCompletion, splitSession } from "@/lib/sessions";
import type { AppData } from "./AppDataProvider";

export interface Released { tasks: number; projects: number }

/**
 * Keeps sessions tidy without a server job. It runs when Aoi opens, when the tab becomes visible, and every minute.
 *  1. A started session paused for an hour is ended: the worked part completes and the rest is split off.
 *  2. A scheduled session that was never started is released once its day has ended (after the cutoff hour), unless
 *     something was active in the last hour. Releasing is the same as unscheduling, plus a small "missed" record.
 */
export function useSessionLifecycle(app: AppData) {
  const { sessions: S, timebox: T, completions: C, missed: M } = app;
  const busy = useRef(new Set<string>()); // stops a repeated effect run from handling the same session twice
  const [released, setReleased] = useState<Released>({ tasks: 0, projects: 0 });

  const split = useCallback(
    (s: Session, worked: number) => {
      if (busy.current.has(s.id)) return;
      busy.current.add(s.id);
      setTimeout(() => busy.current.delete(s.id), 5000);
      const at = new Date();
      const { done, leftover } = splitSession(s, worked, S.items, at);
      void S.save(done);
      void C.save(sessionCompletion(s.id, done.completedMinutes, at));
      if (leftover) void S.save(leftover);
    },
    [S.items, S.save, C.save],
  );

  useEffect(() => {
    if (app.status !== "ready") return;
    const check = () => {
      const at = new Date();

      // 1. Started sessions paused for too long.
      for (const s of S.items) {
        const idle = idleMinutes(s, at);
        if (idle === null || idle < PAUSE_LIMIT_MINUTES) continue;
        if (s.completedMinutes > 0) split(s, s.completedMinutes);
        else {
          // Started but nothing worked: just put it back where it was.
          const placed = T.items.some((e) => e.sourceType === "session" && e.sourceId === s.id);
          void S.save({ ...s, status: placed ? "scheduled" : "unscheduled", lastActiveAt: undefined, updatedAt: at.toISOString(), revision: s.revision + 1 });
        }
      }

      // 2. Missed sessions, once their day has ended and nobody is mid-flow.
      if (recentlyActive(S.items, C.items.map((c) => c.completedAt), at)) return;
      let tasks = 0;
      let projects = 0;
      for (const { session, entry } of sessionsToRelease(S.items, T.items, at)) {
        if (busy.current.has(session.id)) continue;
        busy.current.add(session.id);
        setTimeout(() => busy.current.delete(session.id), 5000);
        void M.save(missedRecord(session, entry, at));
        T.items.filter((e) => e.sourceType === "session" && e.sourceId === session.id).forEach((e) => void T.remove(e.id));
        if (session.ownerType === "project") {
          void S.remove(session.id); // a project session exists only while scheduled
          projects++;
        } else {
          void S.save({ ...session, status: "unscheduled", updatedAt: at.toISOString(), revision: session.revision + 1 });
          tasks++;
        }
      }
      if (tasks + projects > 0) setReleased((r) => ({ tasks: r.tasks + tasks, projects: r.projects + projects }));
    };
    check();
    const id = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [app.status, S.items, T.items, C.items, S.save, S.remove, T.remove, M.save, split]);

  return { split, released, dismissReleased: () => setReleased({ tasks: 0, projects: 0 }) };
}
