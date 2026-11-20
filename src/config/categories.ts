export interface Category { id: string; name: string; color: string }

/** Starter list. User-created categories will come from a repository later (same shape). Mid-tone colors stay visible in light and dark. */
export const CATEGORIES: Category[] = [
  { id: "school", name: "School", color: "#2563eb" },
  { id: "personal", name: "Personal", color: "#c2410c" },
  { id: "work", name: "Work", color: "#047857" },
];
export const UNCATEGORIZED: Category = { id: "none", name: "No category", color: "#6b7280" };

export const categoryFor = (ids: string[]): Category => CATEGORIES.find((c) => c.id === ids[0]) ?? UNCATEGORIZED;
