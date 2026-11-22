"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./pages.module.css";

/** Native <dialog>: the browser traps focus, closes on Esc, and returns focus to the button that opened it. */
export default function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={styles.modal} aria-labelledby={id} onClose={onClose}>
      <h2 id={id}>{title}</h2>
      {open && children}
    </dialog>
  );
}
