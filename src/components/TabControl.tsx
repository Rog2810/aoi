"use client";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Dashboard.module.css";

export interface TabDef { id: string; label: string; content: ReactNode }

/** Accessible tabs: real buttons, roving tabindex, Left/Right arrows move between tabs. */
export default function TabControl({ tabs, label }: { tabs: TabDef[]; label: string }) {
  const [active, setActive] = useState(tabs[0].id);
  const base = useId();
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const next = tabs[(i + step + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`${base}-tab-${next.id}`)?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label={label} className={styles.tabs}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={t.id === active ? 0 : -1}
            className={t.id === active ? styles.tabOn : undefined}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => t.id === active && (
        <div key={t.id} role="tabpanel" id={`${base}-panel-${t.id}`} aria-labelledby={`${base}-tab-${t.id}`}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
