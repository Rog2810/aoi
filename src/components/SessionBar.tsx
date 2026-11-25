"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionTimer } from "./SessionTimerProvider";
import styles from "./SessionBar.module.css";

/** Shown on every page except Home while a session is running, paused or out of time, so it is never forgotten. */
export default function SessionBar() {
  const path = usePathname();
  const t = useSessionTimer();
  const c = t.current;
  if (path === "/" || !c || !(t.running || t.due || c.session.status === "in-progress")) return null;
  const left = Math.max(0, Math.ceil(t.total - t.live));
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const state = t.due ? "time's up" : t.running ? `${clock} left` : `paused, ${clock} left`;
  return (
    <div className={styles.bar} role="region" aria-label="Session in progress">
      <span className={styles.text}><strong>{c.owner.title}</strong>, session {t.num(c.session)}: {state}</span>
      {!t.due && <button onClick={t.toggle}>{t.running ? "Pause" : "Resume"}</button>}
      <Link href="/">{t.due ? "Choose what's next" : "Open dashboard"}</Link>
    </div>
  );
}
