import type { CalendarEvent, Reminder, Session, Task, TimeboxEntry } from "../domain/types";
import { addDays, toDateKey } from "../lib/dates";

/** Deterministic for a given `today`: every date is an offset from it, so the demo never goes stale. No personal data. */
export function sampleData(today: Date) {
  const d0 = toDateKey(today);
  const at = `${d0}T00:00:00.000Z`;
  const base = { createdAt: at, updatedAt: at, revision: 1 };
  const task = (id: string, title: string, due: number, estimateMinutes: number, extra: Partial<Task> = {}): Task => ({
    id, title, dueDate: addDays(d0, due), estimateMinutes, categoryIds: [], tagIds: [], status: "not-started", ...base, ...extra,
  });
  const stamp = (n: number) => `${addDays(d0, n)}T12:00:00.000Z`; // creation date = where the calendar line starts
  const tasks: Task[] = [
    task("t1", "Chemistry lab report", 9, 180, { preferredSessionMinutes: 45, status: "in-progress", categoryIds: ["school"], createdAt: stamp(-6) }),
    task("t2", "Draft methods section", 5, 60, { parentId: "t1", categoryIds: ["school"], createdAt: stamp(-2) }),
    task("t3", "Reply to advisor email", 0, 15, { categoryIds: ["work"], createdAt: stamp(-1) }),
    task("t4", "Read chapter 6", -3, 90, { categoryIds: ["school"], createdAt: stamp(-8) }),
    task("t5", "Final project outline", 21, 120, { preferredSessionMinutes: 60, categoryIds: ["school"], createdAt: stamp(-4) }),
    task("t6", "Book dentist appointment", 6, 20, { categoryIds: ["personal"], createdAt: stamp(-3) }),
    task("t7", "Renew library books", 2, 10, { categoryIds: ["personal"], createdAt: stamp(-5) }),
  ];
  // Partial session t1:s2 stays ONE session: 20 of 45 minutes done.
  const session = (taskId: string, sequence: number, plannedMinutes: number, extra: Partial<Session> = {}): Session => ({
    id: `${taskId}:s${sequence}`, taskId, sequence, plannedMinutes, completedMinutes: 0, status: "unscheduled", ...base, ...extra,
  });
  const sessions: Session[] = [
    session("t1", 1, 45, { completedMinutes: 45, status: "completed" }),
    session("t1", 2, 45, { completedMinutes: 20, status: "in-progress" }), // partial: stays ONE session
    session("t1", 3, 45, { status: "scheduled" }),
    session("t1", 4, 45, { status: "scheduled" }),
    session("t5", 1, 60),
    session("t5", 2, 60),
    session("t6", 1, 1, { status: "scheduled" }), // 1-minute test session
    session("t6", 2, 1), // 1-minute test session that is NOT on the timebox
  ];
  const event = (id: string, title: string, date: string, startMinute: number, endMinute: number, recurrence: CalendarEvent["recurrence"], overlapPolicy: CalendarEvent["overlapPolicy"]): CalendarEvent =>
    ({ id, title, date, startMinute, endMinute, recurrence, overlapPolicy, ...base });
  const events = [
    event("e1", "Chemistry lecture", addDays(d0, -14), 540, 630, "weekly", "exclusive"),
    event("e2", "Study group", d0, 780, 840, "never", "allows-parallel-work"),
    event("e3", "Team standup", addDays(d0, -30), 930, 960, "daily", "exclusive"),
  ];
  const time = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }; // "11:45" -> 705
  const entry = (id: string, date: string, sourceId: string, start: string, end: string): TimeboxEntry =>
    ({ id, date, sourceId, startMinute: time(start), endMinute: time(end), sourceType: "session", manual: true, createdAt: at, updatedAt: at });
  const timebox = [
    entry("b0", d0, "t6:s1", "00:00", "00:01"), // 1-minute test session
    entry("b1", d0, "t1:s2", "11:00", "11:45"),
    entry("b2", d0, "t1:s3", "17:00", "17:45"),
    entry("b3", addDays(d0, 1), "t1:s4", "11:00", "11:45"),
  ];
  const rem = (id: string, title: string, daysAgo: number): Reminder => ({ id, title, lastCompletedDate: addDays(d0, -daysAgo), ...base });
  const reminders = [rem("r1", "Laundry", 6), rem("r2", "General cleaning", 12), rem("r3", "Call family", 3)];
  return { tasks, sessions, events, timebox, reminders };
}
