"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Repository } from "@/db/db";

export type StorageStatus = "loading" | "ready" | "error";

export function usePersistentRecords<T extends { id: string }>(repo: Repository<T>, seed: () => T[]) {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<StorageStatus>("loading");
  const seedRef = useRef(seed);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if ((await repo.count()) === 0) await repo.bulkPut(seedRef.current());
        const loaded = await repo.list();
        if (!cancelled) {
          setItems(loaded);
          setStatus("ready");
        }
      } catch {
        // Private browsing, blocked or full storage. Keep the app usable from memory; never log record contents.
        if (!cancelled) {
          setItems(seedRef.current());
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo]);

  /** Updates the screen immediately, then writes to IndexedDB. Adds the record if it is new. */
  const save = useCallback(
    async (next: T) => {
      setItems((prev) => (prev.some((i) => i.id === next.id) ? prev.map((i) => (i.id === next.id ? next : i)) : [...prev, next]));
      try {
        await repo.put(next);
      } catch {
        setStatus("error");
      }
    },
    [repo],
  );

  /** Removes a record from the screen and from IndexedDB. */
  const remove = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      try {
        await repo.remove(id);
      } catch {
        setStatus("error");
      }
    },
    [repo],
  );

  return { items, status, save, remove };
}
