"use client";
import { useEffect, useState } from "react";

/**
 * The current Date, refreshed every minute and whenever the tab becomes visible again. That is how "Completed Today"
 * empties after midnight without a server job. Null until mounted so server and browser output agree.
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
}
