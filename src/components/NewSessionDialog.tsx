"use client";
import { useState, type FormEvent } from "react";
import type { Task } from "@/domain/types";
import Modal from "./Modal";
import styles from "./pages.module.css";

interface Props { open: boolean; onClose: () => void; tasks: Task[]; onCreate: (taskId: string, minutes: number) => void }

export default function NewSessionDialog({ open, onClose, tasks, onCreate }: Props) {
  const [taskId, setTaskId] = useState("");
  const [length, setLength] = useState("45");
  const [error, setError] = useState("");
  const task = tasks.find((t) => t.id === taskId);
  const minutes = Number(length);
  const valid = Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440;

  const pick = (id: string) => {
    setTaskId(id);
    const t = tasks.find((x) => x.id === id);
    if (t?.preferredSessionMinutes) setLength(String(t.preferredSessionMinutes));
  };
  const close = () => {
    setTaskId("");
    setLength("45");
    setError("");
    onClose();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!task) return setError("Choose a task.");
    if (!valid) return setError("Enter whole minutes from 1 to 1440.");
    onCreate(task.id, minutes);
    close();
  };

  return (
    <Modal open={open} title="New session" onClose={close}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <p className={styles.muted}>Projects generate their own sessions, so this is for tasks.</p>
        <label>
          Task
          <select value={taskId} onChange={(e) => pick(e.target.value)}>
            <option value="">Choose…</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
        <label>
          Length (minutes)
          <input inputMode="numeric" value={length} onChange={(e) => setLength(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "ns-err" : undefined} />
        </label>
        {task && valid && <p className={styles.muted}>This task's estimate goes from {task.estimateMinutes} to {task.estimateMinutes + minutes} minutes.</p>}
        {error && <div id="ns-err" className={styles.err} role="alert">⚠ {error}</div>}
        <div className={styles.row}>
          <button type="submit">Create session</button>
          <button type="button" onClick={close}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
