"use client";
import { useEffect, useRef, useState } from "react";
import { formatMinute } from "@/lib/dates";
import { PAUSE_LIMIT_MINUTES } from "@/lib/sessions";
import MarqueeText from "./MarqueeText";
import { EXTEND_MINUTES, useSessionTimer, type TimerItem } from "./SessionTimerProvider";
import WidgetFrame from "./WidgetFrame";
import styles from "./Dashboard.module.css";

const R = 44;
const C = 2 * Math.PI * R;

/** A view of the session timer, which lives above every page (SessionTimerProvider) and keeps running when you leave Home. */
export default function SessionManagerWidget() {
  const t = useSessionTimer();
  const [skipChoice, setSkipChoice] = useState(false);
  const endRef = useRef<HTMLButtonElement>(null);
  const skipBtnRef = useRef<HTMLButtonElement>(null);
  const skipFirstRef = useRef<HTMLButtonElement>(null);
  const skipWasOpen = useRef(false);
  const { current, next } = t;

  const currentId = current?.session.id;
  useEffect(() => setSkipChoice(false), [currentId]);

  // Focus handling: into the skip choice when it opens, back to the Skip button when it closes, to the first end option when time is up.
  useEffect(() => {
    if (skipChoice) skipFirstRef.current?.focus();
    else if (skipWasOpen.current) skipBtnRef.current?.focus();
    skipWasOpen.current = skipChoice;
  }, [skipChoice]);
  useEffect(() => {
    if (t.due) endRef.current?.focus();
  }, [t.due]);

  const remaining = Math.max(0, Math.ceil(t.total - t.live));
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  const describe = (i: TimerItem) => (
    <>
      <MarqueeText className={styles.strong}>{i.owner.title}</MarqueeText>
      <div>Session {t.num(i.session)}</div>
      <div>
        {i.entry ? `${formatMinute(i.entry.startMinute)}–${formatMinute(i.entry.endMinute)}` : "Not on today's timebox"} · {i.session.plannedMinutes} min planned
        {i.session.completedMinutes > 0 ? `, ${i.session.completedMinutes} done` : ""}
        {i.entry ? `${i.entry.date < t.today ? "Yesterday " : ""}${formatMinute(i.entry.startMinute)}–${formatMinute(i.entry.endMinute)}` : "Not on today's timebox"} · {i.session.plannedMinutes} min planned
      </div>
    </>
  );
  const startLabel = t.running ? "Pause" : current?.session.status === "in-progress" ? "Resume" : "Start";

  return (
    <WidgetFrame title="Session" id="ses-h">
      <div className={styles.sesBoxes}>
        <div className={styles.sesBox} data-marquee-host>
          <div className={styles.muted}>Current</div>
          {current ? describe(current) : <span className={styles.muted}>{t.scheduledToday ? "All of today's sessions are done." : "No sessions scheduled today. Place sessions on the timebox to see them here."}</span>}
        </div>
        <div className={styles.sesBox} data-marquee-host>
          <div className={styles.muted}>Next</div>
          {next ? describe(next) : <span className={styles.muted}>None</span>}
        </div>
      </div>
      {t.paused && t.idle !== null && (
        <p role="status" className={styles.sesNote}>
          Paused for about {Math.floor(t.idle / 5) * 5} min. This session ends on its own after {PAUSE_LIMIT_MINUTES} min paused.
        </p>
      )}
      <div className={styles.sesDials}>
        <div className={styles.ring} role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={Math.max(t.total, 1)} aria-valuenow={Math.min(Math.max(t.total, 1), Math.floor(t.live))} aria-valuetext={`${clock} remaining`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="8" className={styles.ringTrack} />
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="8" strokeLinecap="round" className={styles.ringBar} strokeDasharray={C} strokeDashoffset={C * (1 - t.frac)} />
          </svg>
          <span className={styles.ringText}>{clock}</span>
        </div>
        {t.due && current ? (
          <div className={styles.sesEnd} role="group" aria-label="Session time is up">
            <p role="status">Time's up for Session {t.num(current.session)}. What next?</p>
            <button ref={endRef} onClick={t.keepWorking}>Keep working (+{EXTEND_MINUTES} min)</button>
            {t.sameTaskNext && <button onClick={t.goNextOfTask}>Next session of this task (Session {t.num(t.sameTaskNext)})</button>}
            <button onClick={t.finish}>Finish session</button>
          </div>
        ) : skipChoice && current ? (
          <div className={styles.sesEnd} role="group" aria-label="Finish or skip this session">
            {/* change text for completion */}
            <p>Session {t.num(current.session)}: finishing counts it as done. Skipping leaves it for later: time already worked is saved as its own session and the rest is kept.</p>
            <button ref={skipFirstRef} onClick={() => { t.finish(); setSkipChoice(false); }}>Finish session</button>
            {(t.queueLength > 1 || t.workedNow > 0) && <button onClick={() => { t.skipSession(); setSkipChoice(false); }}>Skip session</button>}
            <button onClick={() => setSkipChoice(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <button className={styles.dial} onClick={t.toggle} disabled={!current} aria-label={`${startLabel} session`}>
              {startLabel}
            </button>
            <button ref={skipBtnRef} className={styles.dial} onClick={() => setSkipChoice(true)} disabled={!current} aria-label="Skip or finish session">Skip</button>
          </>
        )}
      </div>
    </WidgetFrame>
  );
}
