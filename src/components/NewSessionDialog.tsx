"use client";
import { useState, type FormEvent } from "react";
import type { Project, Task } from "@/domain/types";
import Modal from "./Modal";
import styles from "./pages.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onCreate: (ownerType: "task" | "project", ownerId: string, minutes: number) => void;
}

export default function NewSessionDialog({ open, onClose, tasks, projects, onCreate }: Props) {
  const [forId, setForId] = useState(""); // "task:<id>" or "project:<id>"
  const [length, setLength] = useState("45");
  const [error, setError] = useState("");
  const sep = forId.indexOf(":");
  const ownerType = forId.slice(0, sep) === "project" ? "project" : "task";
  const ownerId = forId.slice(sep + 1);
  const task = sep >= 0 && ownerType === "task" ? tasks.find((t) => t.id === ownerId) : undefined;
  const minutes = Number(length);
  const valid = Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440;

  const pick = (value: string) => {
    setForId(value);
    const t = tasks.find((x) => `task:${x.id}` === value);
    if (t?.preferredSessionMinutes) setLength(String(t.preferredSessionMinutes));
  };
  const close = () => {
    setForId("");
    setLength("45");
    setError("");
    onClose();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (sep < 0) return setError("Choose a task or project.");
    if (!valid) return setError("Enter whole minutes from 1 to 1440.");
    onCreate(ownerType, ownerId, minutes);
    close();
  };

  return (
    <Modal open={open} title="New session" onClose={close}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <label>
          For
          <select value={forId} onChange={(e) => pick(e.target.value)}>
            <option value="">Choose…</option>
            <optgroup label="Tasks">{tasks.map((t) => <option key={t.id} value={`task:${t.id}`}>{t.title}</option>)}</optgroup>
            <optgroup label="Projects">{projects.map((p) => <option key={p.id} value={`project:${p.id}`}>{p.title}</option>)}</optgroup>
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
