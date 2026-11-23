"use client";
import { useState, type FormEvent } from "react";
import { CATEGORIES } from "@/config/categories";
import { TAGS } from "@/config/tags";
import type { Project, Task } from "@/domain/types";
import { MAX_CATEGORIES, MAX_TAGS, validateNewTask, type NewTaskInput } from "@/lib/tasks";
import Modal from "./Modal";
import styles from "./pages.module.css";

const EMPTY: NewTaskInput = { title: "", dueDate: "", dueTime: "", estimate: "60", preferred: "", categoryIds: [], tagIds: [], projectId: "" };
interface Props { open: boolean; onClose: () => void; parents: Task[]; projects: Project[]; onCreate: (input: NewTaskInput, parentId?: string) => void }

export default function NewTaskDialog({ open, onClose, parents, projects, onCreate }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [parentId, setParentId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof NewTaskInput>(k: K, v: NewTaskInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k: "categoryIds" | "tagIds", id: string) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] }));
  // A subtask starts with its parent's values, then stays independent.
  const pickParent = (id: string) => {
    setParentId(id);
    const p = parents.find((x) => x.id === id);
    if (p) setForm((f) => ({ ...f, dueDate: p.dueDate, categoryIds: p.categoryIds, tagIds: p.tagIds, projectId: p.projectId ?? f.projectId }));
  };
  const close = () => {
    setForm(EMPTY);
    setParentId("");
    setErrors({});
    onClose();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateNewTask(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onCreate(form, parentId || undefined);
    close();
  };
  const err = (k: string) => errors[k] && <div id={`err-${k}`} className={styles.err} role="alert">⚠ {errors[k]}</div>;
  const bad = (k: string) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `err-${k}` : undefined });

  return (
    <Modal open={open} title="New task" onClose={close}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <label>Title<input value={form.title} onChange={(e) => set("title", e.target.value)} {...bad("title")} /></label>{err("title")}
        <label>Parent task (optional)
          <select value={parentId} onChange={(e) => pickParent(e.target.value)}>
            <option value="">None</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label>Project (optional)
          <select value={form.projectId ?? ""} onChange={(e) => set("projectId", e.target.value)}>
            <option value="">None</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label>Due date<input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} {...bad("dueDate")} /></label>{err("dueDate")}
        <label>Due time (optional)<input type="time" value={form.dueTime} onChange={(e) => set("dueTime", e.target.value)} /></label>
        <label>Estimate (minutes)<input inputMode="numeric" value={form.estimate} onChange={(e) => set("estimate", e.target.value)} {...bad("estimate")} /></label>{err("estimate")}
        <label>Preferred session length (minutes, optional)<input inputMode="numeric" value={form.preferred} onChange={(e) => set("preferred", e.target.value)} {...bad("preferred")} /></label>{err("preferred")}
        <fieldset>
          <legend>Categories (up to {MAX_CATEGORIES})</legend>
          {CATEGORIES.map((c) => <label key={c.id}><input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggle("categoryIds", c.id)} />{c.name}</label>)}
        </fieldset>{err("categories")}
        <fieldset>
          <legend>Tags (up to {MAX_TAGS})</legend>
          {TAGS.map((t) => <label key={t.id}><input type="checkbox" checked={form.tagIds.includes(t.id)} onChange={() => toggle("tagIds", t.id)} />{t.name}</label>)}
        </fieldset>{err("tags")}
        <div className={styles.row}>
          <button type="submit">Create task</button>
          <button type="button" onClick={close}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
