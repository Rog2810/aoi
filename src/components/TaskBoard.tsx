"use client";
import { useState } from "react";
import { toDateKey } from "@/lib/dates";
import { buildTask, columnFor, sessionProgress, sortByDue, type Column } from "@/lib/tasks";
import Modal from "./Modal";
import NewTaskDialog from "./NewTaskDialog";
import TaskCard from "./TaskCard";
import { useNow } from "./useNow";
import { useTaskData } from "./useTaskData";
import styles from "./pages.module.css";

const COLUMNS: { id: Column; title: string }[] = [
  { id: "not-started", title: "Not Started" },
  { id: "in-progress", title: "In Progress" },
  { id: "completed-today", title: "Completed Today" },
];

export default function TaskBoard() {
  const now = useNow();
  return now ? <Board now={now} /> : <p role="status">Loading…</p>;
}

function Board({ now }: { now: Date }) {
  const d = useTaskData(now);
  const [adding, setAdding] = useState(false);
  if (d.status === "loading") return <p role="status">Loading…</p>;

  const today = toDateKey(now);
  const parents = d.tasks.filter((t) => !t.parentId && (t.status === "not-started" || t.status === "in-progress"));

  return (
    <>
      {d.status === "error" && (
        <p role="alert" className={styles.error}>
          Changes could not be saved on this device. Aoi is running from memory, so anything you change will be lost when you close this tab.
        </p>
      )}
      <div className={styles.toolbar}>
        <h1>Tasks</h1>
        <button onClick={() => setAdding(true)}>New task</button>
      </div>
      <div className={styles.board}>
        {COLUMNS.map((c) => {
          const tasks = d.tasks.filter((t) => columnFor(t, d.completions, today) === c.id).sort(sortByDue);
          return (
            <section key={c.id} className={styles.column} aria-labelledby={`col-${c.id}`}>
              <h2 id={`col-${c.id}`}>{c.title} <span className={styles.count}>({tasks.length})</span></h2>
              {tasks.length === 0 ? (
                <p className={styles.muted}>Nothing here.</p>
              ) : (
                <ul className={styles.cards}>
                  {tasks.map((t) => (
                    <TaskCard key={t.id} task={t} parent={d.tasks.find((p) => p.id === t.parentId)} progress={sessionProgress(d.sessions, t.id)} now={now} column={c.id} onStatus={(s) => d.setStatus(t, s)} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <NewTaskDialog
        open={adding}
        onClose={() => setAdding(false)}
        parents={parents}
        onCreate={(input, parentId) => {
          const made = buildTask(input, parentId, new Date());
          d.addTask(made.task, made.sessions);
        }}
      />
      <Modal open={d.parentPrompt !== null} title="Complete the parent task too?" onClose={() => d.answerParent(false)}>
        <p>All subtasks of “{d.parentPrompt?.title}” are complete. Complete it as well, or keep it open for work that isn't listed, like a final review.</p>
        <div className={styles.row}>
          <button onClick={() => d.answerParent(true)}>Complete parent</button>
          <button onClick={() => d.answerParent(false)}>Keep it open</button>
        </div>
      </Modal>
    </>
  );
}
