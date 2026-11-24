import { formatDuration } from "@/lib/projects";
import styles from "./pages.module.css";

/** "2 h 5 min of 3 h spent" with a progress bar. Real minutes against the estimate. */
export default function TimeProgress({ spent, estimate, label }: { spent: number; estimate: number; label: string }) {
  if (estimate <= 0) return null;
  const text = `${formatDuration(spent)} of ${formatDuration(estimate)}`;
  return (
    <div>
      <progress className={styles.weekly} value={Math.min(spent, estimate)} max={estimate} aria-label={label} aria-valuetext={text} />
      <div className={styles.muted}>{text} spent{spent > estimate ? " (over the estimate)" : ""}</div>
    </div>
  );
}
