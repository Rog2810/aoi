"use client";
import { useState, type FormEvent } from "react";
import { CATEGORIES } from "@/config/categories";
import { TAGS } from "@/config/tags";
import { validateNewProject, type NewProjectInput } from "@/lib/projects";
import { MAX_CATEGORIES, MAX_TAGS } from "@/lib/tasks";
import Modal from "./Modal";
import styles from "./pages.module.css";

const EMPTY: NewProjectInput = { title: "", categoryIds: [], tagIds: [], weeklyHours: "" };

export default function NewProjectDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (input: NewProjectInput) => void }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toggle = (k: "categoryIds" | "tagIds", id: string) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] }));
  const close = () => {
    setForm(EMPTY);
    setErrors({});
    onClose();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateNewProject(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onCreate(form);
    close();
  };
  const err = (k: string) => errors[k] && <div id={`pr-err-${k}`} className={styles.err} role="alert">⚠ {errors[k]}</div>;

  return (
    <Modal open={open} title="New project" onClose={close}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <p className={styles.muted}>A project has no due date. Plan work on it with sessions, and attach tasks to it.</p>
        <label>
          Title
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "pr-err-title" : undefined} />
        </label>
        {err("title")}
        <label>
          Weekly target in hours (optional)
          <input inputMode="decimal" value={form.weeklyHours} onChange={(e) => setForm((f) => ({ ...f, weeklyHours: e.target.value }))} aria-invalid={Boolean(errors.weeklyHours)} aria-describedby={errors.weeklyHours ? "pr-err-weeklyHours" : undefined} />
        </label>
        {err("weeklyHours")}
        <fieldset>
          <legend>Categories (up to {MAX_CATEGORIES})</legend>
          {CATEGORIES.map((c) => <label key={c.id}><input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggle("categoryIds", c.id)} />{c.name}</label>)}
        </fieldset>
        {err("categories")}
        <fieldset>
          <legend>Tags (up to {MAX_TAGS})</legend>
          {TAGS.map((t) => <label key={t.id}><input type="checkbox" checked={form.tagIds.includes(t.id)} onChange={() => toggle("tagIds", t.id)} />{t.name}</label>)}
        </fieldset>
        {err("tags")}
        <div className={styles.row}>
          <button type="submit">Create project</button>
          <button type="button" onClick={close}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
