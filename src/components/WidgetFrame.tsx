import type { ReactNode } from "react";
import styles from "./Dashboard.module.css";

/** Shared panel chrome (title row + body). Widgets never own domain data; they receive it as props. */
export default function WidgetFrame({ title, id, actions, wide, children }: { title: string; id: string; actions?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <section className={wide ? `${styles.widget} ${styles.wide}` : styles.widget} aria-labelledby={id}>
      <header className={styles.head}>
        <h2 id={id}>{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}
