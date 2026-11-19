/** Serializable, versioned domain records. Pure data: no UI or storage imports. */
export type TaskStatus = "not-started" | "in-progress" | "completed" | "cancelled";
export type SessionStatus = "unscheduled" | "scheduled" | "in-progress" | "completed";

interface Versioned {
  id: string;
  createdAt: string; // ISO timestamp
  updatedAt: string;
  revision: number; // bumped on every edit; future sync/conflict detection hooks in here
}

/** Subtasks are full tasks linked by parentId; their values are independent after creation. */
export interface Task extends Versioned {
  title: string;
  description?: string;
  dueDate: string; // local calendar date "YYYY-MM-DD"
  dueTime?: string; // "HH:mm"
  estimateMinutes: number;
  preferredSessionMinutes?: number;
  categoryIds: string[]; // 1-2, enforced by validation, not by the schema
  tagIds: string[]; // 1-3, enforced by validation
  status: TaskStatus;
  parentId?: string;
}

/** One logical work block. A partial session stays ONE session (completedMinutes < plannedMinutes). */
export interface Session extends Versioned {
  taskId: string;
  sequence: number;
  plannedMinutes: number;
  completedMinutes: number;
  status: SessionStatus;
}

/** History is kept as records, not a Boolean, so reports and sync can use it later. */
export interface CompletionRecord {
  id: string;
  sourceId: string;
  sourceType: "task" | "reminder" | "session";
  completedAt: string;
  localDate: string;
  minutesSpent?: number;
  notes?: string;
  retroactive: boolean;
  createdAt: string;
}

/** Minutes from midnight (9:05 AM = 545) so five-minute snapping is integer math. */
export interface TimeboxEntry {
  id: string;
  date: string;
  startMinute: number;
  endMinute: number;
  sourceType: "event" | "session";
  sourceId: string;
  manual: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent extends Versioned {
  title: string;
  date: string; // first occurrence, "YYYY-MM-DD"
  startMinute: number;
  endMinute: number;
  recurrence: "never" | "daily" | "weekly" | "monthly"; // richer rules ("every Monday 8:30") can extend this later
  overlapPolicy: "exclusive" | "allows-parallel-work"; // always chosen by the user, never inferred
}

/** Repeats forever and has no deadline; completing it resets "days since" instead of removing it. */
export interface Reminder extends Versioned {
  title: string;
  lastCompletedDate: string;
}
