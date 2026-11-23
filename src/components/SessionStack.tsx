"use client";
import { useId, type CSSProperties, type ReactNode } from "react";
import styles from "./pages.module.css";

export interface StackItem { id: string; grip: boolean; body: ReactNode }
const vars = (v: Record<string, string | number>) => v as CSSProperties;

/**
 * Stacked cards: only the first (the next session) is fully visible and the rest peek out below it. The toggle is
 * a real checkbox, so it works with a keyboard and screen readers without script. CSS animates the spread with
 * transforms; the container height changes along with it.
 */
export default function SessionStack({ items, height = 64 }: { items: StackItem[]; height?: number }) {
  const id = useId();
  const n = items.length;
  return (
    <div className={styles.stack} style={vars({ "--n": n, "--k": Math.min(n - 1, 2), "--h": `${height}px` })}>
      {n > 1 && <input id={id} type="checkbox" className={styles.tg} />}
      <div className={styles.cards}>
        {items.map((it, i) => (
          <div key={it.id} className={i === 0 ? `${styles.sc} ${styles.top}` : styles.sc} style={vars({ "--i": i, "--p": Math.min(i, 2) })}>
            <div className={styles.inner}>
              {it.grip && <span className={styles.grip} aria-hidden="true" />}
              {it.body}
            </div>
          </div>
        ))}
        {n > 1 && <label htmlFor={id} className={styles.peek} title={`Show all ${n} sessions`} />}
      </div>
      {n > 1 && (
        <label htmlFor={id} className={styles.cap}>
          Show all {n} sessions<span className={styles.chev} aria-hidden="true" />
        </label>
      )}
    </div>
  );
}
