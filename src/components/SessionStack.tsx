"use client";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./pages.module.css";

export interface StackItem {
  id: string;
  grip: boolean;
  text: ReactNode; // the lines of text, each a <span className={styles.ln}>
  tip: string; // full text for the tooltip
  action?: ReactNode; // an icon button, kept outside the expand button
}
const vars = (v: Record<string, string | number>) => v as CSSProperties;

/**
 * Stacked cards: only the first (the next session) is fully visible and the rest peek out below it. Click the top
 * card (or a peeking edge) to spread them out; click the top card again to close. CSS animates the spread with
 * transforms; the container height changes along with it.
 */
export default function SessionStack({ items, height = 64 }: { items: StackItem[]; height?: number }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const n = items.length;
  const toggle = () => setOpen((o) => !o);

  return (
    <div className={open ? `${styles.stack} ${styles.open}` : styles.stack} style={vars({ "--n": n, "--k": Math.min(n - 1, 2), "--h": `${height}px` })}>
      <div className={styles.cards} id={panel}>
        {items.map((it, i) => (
          <div key={it.id} className={i === 0 ? `${styles.sc} ${styles.top}` : styles.sc} style={vars({ "--i": i, "--p": Math.min(i, 2) })}>
            <div className={styles.inner}>
              {it.grip && <span className={styles.grip} aria-hidden="true" />}
              {n > 1 && i === 0 ? (
                <button type="button" className={styles.txBtn} aria-expanded={open} aria-controls={panel} title={`${it.tip}\nClick to ${open ? "close" : `show all ${n} sessions`}`} onClick={toggle}>
                  {it.text}
                  <span className={styles.srOnly}>, shows all {n} sessions</span>
                </button>
              ) : (
                <div className={styles.tx} title={it.tip}>{it.text}</div>
              )}
              {it.action}
            </div>
          </div>
        ))}
        {/* Mouse convenience only: the top card's button is the keyboard and screen reader way to open the stack. */}
        {n > 1 && !open && <div className={styles.peek} aria-hidden="true" onClick={toggle} />}
      </div>
    </div>
  );
}
