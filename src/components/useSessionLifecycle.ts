"use client";
import { useCallback, useEffect, useRef } from "react";
import type { CompletionRecord, Session, TimeboxEntry } from "@/domain/types";
import { idleMinutes, PAUSE_LIMIT_MINUTES, sessionCompletion, splitSession } from "@/lib/sessions";

interface Args {
  ready: boolean;
  sessions: Session[];
  timebox: TimeboxEntry[];
  saveSession: (s: Session) => Promise<void>;
  saveCompletion: (c: CompletionRecord) => Promise<void>;
}

/**
 * Ends sittings on sessions that were worked on and then left: the worked part completes and the rest is split off.
 * Runs on Home and on the Timebox page. A paused session is only ended after PAUSE_LIMIT_MINUTES, because a pause is a break.
 */
export function useSessionLifecycle({ ready, sessions, timebox, saveSession, saveCompletion }: Args) {
  const busy = useRef(new Set<string>()); // stops a repeated effect run from splitting the same session twice

  const split = useCallback(
    (s: Session, worked: number) => {
      if (busy.current.has(s.id)) return;
      busy.current.add(s.id);
      setTimeout(() => busy.current.delete(s.id), 5000);
      const at = new Date();
      const { done, leftover } = splitSession(s, worked, sessions, at);
      void saveSession(done);
      void saveCompletion(sessionCompletion(s.id, done.completedMinutes, at));
      if (leftover) void saveSession(leftover);
    },
    [sessions, saveSession, saveCompletion],
  );

  useEffect(() => {
    if (!ready) return;
    const check = () => {
      const at = new Date();
      for (const s of sessions) {
        const idle = idleMinutes(s, at);
        if (idle === null || idle < PAUSE_LIMIT_MINUTES) continue;
        if (s.completedMinutes > 0) split(s, s.completedMinutes);
        else {
          // Started but nothing worked: just put it back where it was.
          const placed = timebox.some((e) => e.sourceType === "session" && e.sourceId === s.id);
          void saveSession({ ...s, status: placed ? "scheduled" : "unscheduled", lastActiveAt: undefined, updatedAt: at.toISOString(), revision: s.revision + 1 });
        }
      }
    };
    check();
    const id = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [ready, sessions, timebox, split, saveSession]);

  return { split };
}
