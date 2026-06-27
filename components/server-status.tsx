"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/*
  Polls /api/health and surfaces a calm, bottom-right toast when the backend is
  unreachable (e.g. the self-hosted stack is asleep), then quietly confirms when
  it reconnects. Kept positive and reassuring - not an error alarm.
*/

const TOAST_ID = "server-status";
const POLL_OK_MS = 30000; // healthy: relaxed heartbeat
const POLL_DOWN_MS = 10000; // down: check back a bit sooner to confirm recovery

export function ServerStatus() {
  const isDown = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule() {
      if (timer) clearTimeout(timer);
      // Only poll while the tab is visible - no wasted calls in background tabs.
      if (document.hidden) return;
      timer = setTimeout(tick, isDown.current ? POLL_DOWN_MS : POLL_OK_MS);
    }

    async function tick() {
      let ok = false;
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        ok = res.ok;
      } catch {
        ok = false;
      }
      if (!active) return;

      if (!ok && !isDown.current) {
        isDown.current = true;
        toast.loading("Reconnecting to log0...", {
          id: TOAST_ID,
          description:
            "The backend is catching its breath. Your data is safe and we will reconnect automatically.",
          duration: Infinity,
          position: "bottom-right",
        });
      } else if (ok && isDown.current) {
        isDown.current = false;
        toast.success("Back online", {
          id: TOAST_ID,
          description: "Reconnected to the log0 backend.",
          duration: 3000,
          position: "bottom-right",
        });
      }
      schedule();
    }

    function onVisibility() {
      // Resume immediately when the user returns to the tab.
      if (!document.hidden) tick();
    }

    tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
