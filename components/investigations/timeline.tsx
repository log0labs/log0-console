"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { buildTimeline, type Tone } from "@/lib/timeline";
import type { ConnectionState } from "@/lib/event-stream";
import type { StreamEvent } from "@/types/investigation";

const DOT: Record<Tone, string> = {
  info: "bg-muted-foreground/60",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
};

const STATE_LABEL: Partial<Record<ConnectionState, string>> = {
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  polling: "Live updates unavailable, checking every few seconds",
  error: "Could not follow this investigation",
};

function clock(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : format(date, "HH:mm:ss");
}

interface TimelineProps {
  events: StreamEvent[];
  state: ConnectionState;
  /** True while the run can still produce events: shows the working indicator. */
  working: boolean;
}

/** What the investigation did, step by step, as the events arrive. */
export function Timeline({ events, state, working }: TimelineProps) {
  const rows = useMemo(() => buildTimeline(events), [events]);
  const notice = STATE_LABEL[state];

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {working ? "Starting…" : "No steps were recorded."}
        </p>
      )}

      <ol className="flex flex-col" aria-live="polite">
        {rows.map((row, i) => (
          <li key={row.key} className="flex items-start gap-3 py-1.5">
            <div className="mt-1.5 flex flex-col items-center">
              <span
                className={cn("h-2 w-2 rounded-full", DOT[row.tone])}
                aria-hidden
              />
              {i < rows.length - 1 && (
                <span className="mt-1 h-full min-h-4 w-px bg-border" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{row.title}</span>
                <time className="shrink-0 font-mono text-xs text-muted-foreground">
                  {clock(row.at)}
                </time>
              </div>
              {row.detail && (
                <p className="text-sm break-words text-muted-foreground">
                  {row.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {working && rows.length > 0 && (
        <p className="animate-pulse text-xs text-muted-foreground">Working…</p>
      )}
      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
    </div>
  );
}
