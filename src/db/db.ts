import Dexie, { type Table } from "dexie";
import type { CompletionRecord, Reminder, Session, Task, TimeboxEntry, Project, MissedSession } from "../domain/types";
import type { LayoutConfig } from "../lib/shareCode";

/** Only this file knows about Dexie/IndexedDB. Everything else talks to repositories. */
export class AoiDb extends Dexie {
  tasks!: Table<Task, string>;
  reminders!: Table<Reminder, string>;
  sessions!: Table<Session, string>;
  completions!: Table<CompletionRecord, string>;
  timebox!: Table<TimeboxEntry, string>;
  layouts!: Table<{ id: string; config: LayoutConfig }, string>;
  projects!: Table<Project, string>;
  missed!: Table<MissedSession, string>;

  constructor(name = "aoi") {
    super(name);
    this.version(1).stores({
      tasks: "id, dueDate, status, parentId",
      sessions: "id, taskId, status",
      completions: "id, sourceId, localDate",
      timebox: "id, date",
      layouts: "id",
    });
    // Never edit an older version: browsers that already have it would not upgrade correctly.
    // Add a new version instead, listing only the tables that are new or changed.
    this.version(2).stores({ reminders: "id" });
    // v3: sessions belong to a task OR a project, and projects get a table.
    this.version(3)
      .stores({ sessions: "id, ownerId, status", projects: "id, status" })
      .upgrade((tx) =>
        tx.table("sessions").toCollection().modify((s: Record<string, unknown>) => {
          s.ownerType = "task";
          s.ownerId = s.taskId;
          delete s.taskId;
        }),
      );
    this.version(4).stores({ missed: "id, ownerId, date" });
  }
}

export interface Repository<T extends { id: string }> {
  list(): Promise<T[]>;
  count(): Promise<number>;
  put(item: T): Promise<void>;
  bulkPut(items: T[]): Promise<void>;
  remove(id: string): Promise<void>;
}
export type TaskRepository = Repository<Task>;
export type ReminderRepository = Repository<Reminder>;

/** EXTENSION POINT: a future SyncQueue/CloudRepository wraps these writes to track unsynced revisions. */
const repo = <T extends { id: string }>(table: Table<T, string>): Repository<T> => ({
  list: () => table.toArray(),
  count: () => table.count(),
  put: async (item) => {
    await table.put(item);
  },
  bulkPut: async (items) => {
    await table.bulkPut(items);
  },
  remove: (id) => table.delete(id),
});

export const createRepositories = (db: AoiDb = new AoiDb()) => ({
  tasks: repo(db.tasks),
  reminders: repo(db.reminders),
  sessions: repo(db.sessions),
  completions: repo(db.completions),
  timebox: repo(db.timebox),
  projects: repo(db.projects),
  missed: repo(db.missed),
});

let shared: ReturnType<typeof createRepositories> | undefined;
/** One database connection per browser tab. Call only in the browser (after mount). */
export const getRepositories = () => (shared ??= createRepositories());
