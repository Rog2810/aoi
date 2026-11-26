import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./pages.module.css";

type Props = { label: string; children: ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title" | "children">;

/** A button that shows only an icon. The label is its accessible name and its tooltip. */
export default function IconButton({ label, children, ...rest }: Props) {
  return (
    <button {...rest} aria-label={label} title={label} className={styles.iconBtn}>
      {children}
    </button>
  );
}
