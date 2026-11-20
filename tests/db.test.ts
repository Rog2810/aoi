import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { AoiDb, createRepositories } from "../src/db/db";
import type { Reminder } from "../src/domain/types";

const db = new AoiDb("aoi-test");
const repos = createRepositories(db);
const stamp = "2026-11-01T00:00:00.000Z";
const reminder: Reminder = { id: "r1", title: "Laundry", lastCompletedDate: "2026-11-13", createdAt: stamp, updatedAt: stamp, revision: 1 };

beforeEach(async () => {
  await db.reminders.clear();
});

describe("repositories", () => {
  it("stores and lists records", async () => {
    await repos.reminders.put(reminder);
    expect(await repos.reminders.list()).toEqual([reminder]);
  });
  it("replaces a record with the same id", async () => {
    await repos.reminders.put(reminder);
    await repos.reminders.put({ ...reminder, revision: 2 });
    expect(await repos.reminders.count()).toBe(1);
    expect((await repos.reminders.list())[0].revision).toBe(2);
  });
});
