import { cn } from "@/lib/utils";
import type { Stage, StageState } from "@/lib/stages";

const NODE: Record<StageState, string> = {
  done: "bg-primary border-primary",
  active: "bg-background border-primary animate-pulse",
  waiting: "bg-severity-high border-severity-high",
  pending: "bg-background border-border",
  skipped: "bg-background border-dashed border-border",
  failed: "bg-destructive border-destructive",
};

const LABEL: Record<StageState, string> = {
  done: "text-foreground",
  active: "text-foreground font-medium",
  waiting: "text-severity-high font-medium",
  pending: "text-muted-foreground/60",
  skipped: "text-muted-foreground/50 line-through",
  failed: "text-destructive font-medium",
};

/** The run as a row of stages: filled when done, pulsing where it is now. Labels shrink to the active one on a phone. */
export function StageRail({ stages }: { stages: Stage[] }) {
  return (
    <ol className="flex items-start" aria-label="Investigation progress">
      {stages.map((stage, i) => {
        const current = stage.state === "active" || stage.state === "waiting";
        return (
          <li
            key={stage.id}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5"
            aria-current={current ? "step" : undefined}
          >
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-[5px] right-1/2 h-px w-full",
                  stage.state === "pending" || stage.state === "skipped"
                    ? "bg-border"
                    : "bg-primary/60"
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 size-[11px] rounded-full border-2",
                NODE[stage.state]
              )}
            />
            <span
              className={cn(
                "max-w-full truncate px-0.5 text-[11px] leading-none",
                LABEL[stage.state],
                !current && "max-sm:hidden"
              )}
            >
              {stage.label}
              {stage.count ? (
                <span className="ml-1 font-mono text-muted-foreground">
                  {stage.count}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
