import { DiffViewer } from "@/components/investigations/diff-viewer";
import { BulletBlock } from "@/components/investigations/bullet-block";
import { SectionLabel } from "@/components/ui/section-label";
import { PullRequestCard } from "@/components/investigations/pull-request-card";
import type { PullRequestProgress } from "@/lib/pull-request";
import type { Investigation } from "@/types/investigation";

/** What to do about it: the recommendation, its checklist, and the diff when one passed validation. */
export function FixPanel({
  run,
  pullRequest,
}: {
  run: Investigation;
  pullRequest?: PullRequestProgress | null;
}) {
  const rec = run.recommendation;
  if (!rec && !run.diff) {
    return (
      <p className="text-sm text-muted-foreground">
        No fix was proposed. Connect the service&apos;s repository to get one.
      </p>
    );
  }
  return (
    <>
      {pullRequest && <PullRequestCard progress={pullRequest} />}
      {rec && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{rec.summary}</p>
          {rec.rationale && (
            <p className="text-sm text-muted-foreground">{rec.rationale}</p>
          )}
        </div>
      )}
      {run.diff ? (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Proposed change</SectionLabel>
          <DiffViewer diff={run.diff} investigationId={run.id} />
        </div>
      ) : (
        rec &&
        rec.changes.length > 0 && (
          <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            A change was proposed but did not pass validation, so no diff is
            shown.
          </p>
        )
      )}
      {rec && (
        <div className="grid gap-4 sm:grid-cols-2">
          <BulletBlock title="Risks" items={rec.risks} />
          <BulletBlock title="Tests" items={rec.testsRequired} />
          <BulletBlock title="Verify" items={rec.verificationSteps} />
        </div>
      )}
    </>
  );
}
