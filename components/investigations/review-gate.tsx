"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GateCard } from "@/components/investigations/gate-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useResumeInvestigation } from "@/hooks/use-investigations";
import {
  buildDecision,
  decisionErrorMessage,
  MAX_NOTE_LENGTH,
  validateDecision,
  type PendingReview,
} from "@/lib/review";
import type { ReviewAction } from "@/types/investigation";

interface ReviewGateProps {
  investigationId: string;
  review: PendingReview;
  /** Only ADMIN and ENGINEER can answer; others see the question but no buttons. */
  canAnswer: boolean;
}

/** The run paused with a root cause and asks: continue to code changes, look again, or stop. */
export function ReviewGate({
  investigationId,
  review,
  canAnswer,
}: ReviewGateProps) {
  const [refining, setRefining] = useState(false);
  const [note, setNote] = useState("");
  const resume = useResumeInvestigation(investigationId);
  const problem = refining ? validateDecision("refine", note, review) : null;

  function answer(action: ReviewAction) {
    if (resume.isPending) return;
    if (validateDecision(action, note, review)) return;
    resume.mutate(buildDecision(action, note), {
      onSuccess: () => {
        setRefining(false);
        setNote("");
      },
      onError: (error) => toast.error(decisionErrorMessage(error)),
    });
  }

  return (
    <GateCard
      label="Review the root cause"
      aside={
        <>
          <span>Round {review.round}</span>
          {review.confidenceBand && (
            <Badge variant="outline">{review.confidenceBand} confidence</Badge>
          )}
        </>
      }
    >
      <p className="text-sm">{review.rootCause}</p>
      {review.recommendation && (
        <p className="text-sm text-muted-foreground">
          Suggested: {review.recommendation}
        </p>
      )}

      {!canAnswer ? (
        <p className="text-xs text-muted-foreground">
          An engineer or admin needs to answer this review.
        </p>
      ) : refining ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="review-note">
            What should it look at differently?
          </Label>
          <Textarea
            id="review-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={MAX_NOTE_LENGTH + 100}
            autoFocus
          />
          {note.trim() !== "" && problem && (
            <p role="alert" className="text-xs text-destructive">
              {problem}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRefining(false)}
              disabled={resume.isPending}
            >
              Back
            </Button>
            <Button
              size="sm"
              onClick={() => answer("refine")}
              disabled={!!problem || resume.isPending}
            >
              {resume.isPending ? "Sending…" : "Send hint"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-2 max-sm:[&>button]:flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => answer("stop")}
            disabled={resume.isPending}
          >
            Stop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefining(true)}
            disabled={resume.isPending || review.refinesLeft <= 0}
            title={review.refinesLeft <= 0 ? "No refinements left" : undefined}
          >
            Refine
            {review.refinesLeft > 0 ? ` (${review.refinesLeft} left)` : ""}
          </Button>
          <Button
            size="sm"
            onClick={() => answer("approve")}
            disabled={resume.isPending}
          >
            {resume.isPending ? "Sending…" : "Approve"}
          </Button>
        </div>
      )}
    </GateCard>
  );
}
