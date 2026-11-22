export interface Tag { id: string; name: string }

/** Starter list. User-created tags will come from a repository later (same shape). */
export const TAGS: Tag[] = [
  { id: "assignment", name: "Assignment" },
  { id: "email", name: "Email" },
  { id: "reading", name: "Reading" },
  { id: "high-focus", name: "High Focus" },
  { id: "group-work", name: "Group Work" },
];
