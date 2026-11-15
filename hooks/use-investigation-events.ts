"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshAccessToken } from "@/lib/api";
import {
  followInvestigation,
  mergeEvents,
  type ConnectionState,
} from "@/lib/event-stream";
import { investigationKeys } from "@/hooks/use-investigations";
import { useAuthStore } from "@/store/auth";
import { TERMINAL_EVENT_TYPES, type StreamEvent } from "@/types/investigation";

/** Event types after which the stored record has changed enough to be worth re-reading. */
const REFRESH_ON = new Set([
  ...TERMINAL_EVENT_TYPES,
  "review.requested",
  "review.decided",
  "root_cause.identified",
  "diff.generated",
]);

const EMPTY: StreamEvent[] = [];

/**
 * The live events of one investigation, in order. Pass `null` to follow nothing.
 * Follows the stream while the component is mounted and `enabled` is true; the connection state says
 * whether the events are arriving live, by polling, or not at all.
 */
export function useInvestigationEvents(
  investigationId: string | null,
  enabled = true
) {
  const queryClient = useQueryClient();
  // Events are stored with the id they belong to, so switching investigations never shows the old ones.
  const [stored, setStored] = useState<{
    id: string | null;
    events: StreamEvent[];
  }>({ id: null, events: [] });
  const [state, setState] = useState<ConnectionState>("connecting");
  const eventsRef = useRef<StreamEvent[]>([]);

  useEffect(() => {
    eventsRef.current = [];
    if (!investigationId || !enabled) return;

    const controller = new AbortController();
    const base = `/api/v1/investigations/${investigationId}`;

    void followInvestigation({
      streamUrl: `${base}/stream`,
      eventsUrl: `${base}/events`,
      afterSeq: 0,
      getToken: () => useAuthStore.getState().accessToken,
      refreshToken: () => refreshAccessToken().catch(() => null),
      onEvents: (incoming) => {
        eventsRef.current = mergeEvents(eventsRef.current, incoming);
        setStored({ id: investigationId, events: eventsRef.current });
        if (incoming.some((event) => REFRESH_ON.has(event.type))) {
          void queryClient.invalidateQueries({
            queryKey: investigationKeys.one(investigationId),
          });
          void queryClient.invalidateQueries({ queryKey: ["investigations"] });
        }
      },
      onState: setState,
      signal: controller.signal,
    });

    return () => controller.abort();
  }, [investigationId, enabled, queryClient]);

  const events = stored.id === investigationId ? stored.events : EMPTY;
  return { events, state };
}
