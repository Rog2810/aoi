import Dexie, { type Table } from "dexie";
import type { CompletionRecord, Session, Task, TimeboxEntry } from "../domain/types";
import type { LayoutConfig } from "../lib/shareCode";

/** Only repositories import this. React components receive data through services/state, never Dexie. */
export class AoiDb extends Dexie {
  tasks!: Table<Task, string>;
  sessions!: Table<Session, string>;
  completions!: Table<CompletionRecord, string>;
  timebox!: Table<TimeboxEntry, string>;
  layouts!: Table<{ id: string; config: LayoutConfig }, string>;

  constructor() {
    super("aoi");
    // Add this.version(2).stores({...}).upgrade(...) for every later schema change; never edit version 1.
    this.version(1).stores({
      tasks: "id, dueDate, status, parentId",
      sessions: "id, taskId, status",
      completions: "id, sourceId, localDate",
      timebox: "id, date",
      layouts: "id",
    });
  }
}

export interface TaskRepository {
  list(): Promise<Task[]>;
  put(task: Task): Promise<void>;
  remove(id: string): Promise<void>;
}

/** EXTENSION POINT: a future CloudRepository / SyncQueue wraps these writes to track unsynced revisions. */
export const createTaskRepository = (db: AoiDb = new AoiDb()): TaskRepository => ({
  list: () => db.tasks.orderBy("dueDate").toArray(),
  put: async (task) => void (await db.tasks.put(task)),
  remove: (id) => db.tasks.delete(id),
});
