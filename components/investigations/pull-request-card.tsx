import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/section-label";
import { isSafePrUrl, type PullRequestProgress } from "@/lib/pull-request";
import { cn } from "@/lib/utils";
import type { CiOutcome } from "@/types/investigation";

const OUTCOME: Record<CiOutcome, { label: string; tone: string }> = {
  passed: {
    label: "Checks passed",
    tone: "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
  },
  failed: {
    label: "Checks failed",
    tone: "bg-destructive/10 text-destructive border-destructive/30",
  },
  timeout: {
    label: "Checks still running",
    tone: "bg-severity-high/15 text-severity-high border-severity-high/30",
  },
  none: {
    label: "No checks, not verified",
    tone: "bg-muted text-muted-foreground border-border",
  },
};

/** The draft pull request log0 made for this fix: its link, and what the checks of the repository said. */
export function PullRequestCard({
  progress,
}: {
  progress: PullRequestProgress;
}) {
  if (progress.phase === "declined") {
    return (
      <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
        No pull request was opened. The diff below is the fix.
      </p>
    );
  }
  const { pr, tests } = progress;
  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <SectionLabel>Pull request</SectionLabel>
      {pr ? (
        <p className="text-sm">
          {isSafePrUrl(pr.url) ? (
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Draft pull request #{pr.number}
            </a>
          ) : (
            <span className="font-medium">Draft pull request #{pr.number}</span>
          )}
          <span className="text-muted-foreground">
            {progress.outcome === "merged"
              ? " was merged."
              : progress.outcome === "closed"
                ? " was closed without merging."
                : " is ready for review."}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {progress.commit
            ? "Waiting for the checks of the repository…"
            : progress.branch
              ? "Committing the change…"
              : "Creating the branch…"}
        </p>
      )}
      {tests && (
        <div className="flex flex-col gap-1.5">
          <Badge
            variant="outline"
            className={cn("w-fit", OUTCOME[tests.outcome].tone)}
          >
            {OUTCOME[tests.outcome].label}
          </Badge>
          {tests.source === "sandbox" && (
            <p className="text-xs text-muted-foreground">
              Run by log0 in an isolated sandbox, not in your CI.
            </p>
          )}
          {tests.checks.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {tests.checks.map((check) => (
                <li key={check.name} className="flex justify-between gap-2">
                  <span className="truncate">{check.name}</span>
                  <span className="shrink-0 font-mono">{check.conclusion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
