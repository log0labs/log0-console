import { differenceInSeconds } from "date-fns";
import type { Investigation } from "@/types/investigation";

function money(value: number | string | null): string | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(n < 0.01 ? 4 : 2)}` : null;
}

function duration(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const s = differenceInSeconds(new Date(end), new Date(start));
  if (!Number.isFinite(s) || s < 0) return null;
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

/** Model, time, tools, tokens and cost as small facts on one wrapping line. */
export function RunMeta({ run }: { run: Investigation }) {
  const tokens =
    run.inputTokens != null || run.outputTokens != null
      ? `${compact((run.inputTokens ?? 0) + (run.outputTokens ?? 0))} tokens`
      : null;
  const facts = [
    run.model,
    duration(run.startedAt, run.completedAt),
    run.toolCallCount != null ? `${run.toolCallCount} tool calls` : null,
    tokens,
    money(run.costUsd),
    run.repoSha ? `@${run.repoSha.slice(0, 7)}` : null,
  ].filter(Boolean) as string[];
  if (facts.length === 0) return null;
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
      {facts.map((f) => (
        <span key={f}>{f}</span>
      ))}
    </p>
  );
}
