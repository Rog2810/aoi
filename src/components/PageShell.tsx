import type { ReactNode } from "react";
import { APP_NAME } from "@/config/app";
import Nav from "./Nav";
import ReleasedNote from "./ReleasedNote";
import styles from "./pages.module.css";

/** Shared frame for every page except Home: brand and menu on top, content below. */
export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <main id="main" className={styles.page}>
      <div className={styles.bar}>
        <strong className={styles.brand}>{APP_NAME}</strong>
        <Nav />
      </div>
      <ReleasedNote />
      {children}
    </main>
  );
}
