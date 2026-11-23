import type { Project } from "../domain/types";
import { MAX_CATEGORIES, MAX_TAGS } from "./tasks";

export interface NewProjectInput { title: string; categoryIds: string[]; tagIds: string[] }

/** Field name -> message. An empty object means the input is valid. */
export function validateNewProject(i: NewProjectInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (!i.title.trim()) e.title = "Enter a title.";
  if (i.categoryIds.length > MAX_CATEGORIES) e.categories = `Choose at most ${MAX_CATEGORIES} categories.`;
  if (i.tagIds.length > MAX_TAGS) e.tags = `Choose at most ${MAX_TAGS} tags.`;
  return e;
}

export function buildProject(i: NewProjectInput, at: Date): Project {
  const now = at.toISOString();
  return { id: crypto.randomUUID(), title: i.title.trim(), categoryIds: i.categoryIds, tagIds: i.tagIds, status: "active", createdAt: now, updatedAt: now, revision: 1 };
}
