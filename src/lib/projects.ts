import type { CompletionRecord, Project, Session } from "../domain/types";
import { addDays } from "./dates";
import { MAX_CATEGORIES, MAX_TAGS } from "./tasks";

/** Projects have no estimate, so their sessions use a default length and are generated, not created by hand. */
export const PROJECT_SESSION_MINUTES = 60;

export interface NewProjectInput { title: string; categoryIds: string[]; tagIds: string[]; weeklyHours: string }

const validHours = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 168;
};

/** Field name -> message. An empty object means the input is valid. */
export function validateNewProject(i: NewProjectInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (!i.title.trim()) e.title = "Enter a title.";
  if (i.categoryIds.length > MAX_CATEGORIES) e.categories = `Choose at most ${MAX_CATEGORIES} categories.`;
  if (i.tagIds.length > MAX_TAGS) e.tags = `Choose at most ${MAX_TAGS} tags.`;
  if (i.weeklyHours.trim() !== "" && !validHours(i.weeklyHours)) e.weeklyHours = "Enter hours like 4 or 2.5, or leave it blank.";
  return e;
}

export function buildProject(i: NewProjectInput, at: Date): Project {
  const now = at.toISOString();
  const hours = i.weeklyHours.trim();
  return {
    id: crypto.randomUUID(),
    title: i.title.trim(),
    categoryIds: i.categoryIds,
    tagIds: i.tagIds,
    status: "active",
    weeklyTargetMinutes: hours ? Math.round(Number(hours) * 60) : undefined,
    createdAt: now,
    updatedAt: now,
    revision: 1,
  };
}

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
};

/** First day ("YYYY-MM-DD") of the week containing `today`; weekStart 1 = Monday, 0 = Sunday. */
export function weekStartKey(today: string, weekStart: 0 | 1 = 1): string {
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return addDays(today, -((dow - weekStart + 7) % 7));
}

/** Real minutes worked on a project's sessions that were completed this week. */
export function minutesThisWeek(projectId: string, sessions: Session[], completions: CompletionRecord[], today: string, weekStart: 0 | 1 = 1): number {
  const ids = new Set(sessions.filter((s) => s.ownerId === projectId).map((s) => s.id));
  const from = weekStartKey(today, weekStart);
  const to = addDays(from, 6);
  return completions
    .filter((c) => c.sourceType === "session" && ids.has(c.sourceId) && c.localDate >= from && c.localDate <= to)
    .reduce((n, c) => n + (c.minutesSpent ?? 0), 0);
}
