"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendFeedback } from "@/hooks/use-investigations";
import {
  buildFeedback,
  FEEDBACK_OPTIONS,
  MAX_FEEDBACK_NOTE,
  readSentVerdict,
  rememberVerdict,
  validateFeedback,
  type FeedbackVerdict,
} from "@/lib/feedback";

/** "Was this useful?": one tap for a verdict, a note when it was off. Wrong answers are never recalled later. */
export function FeedbackBar({ investigationId }: { investigationId: string }) {
  const [sent, setSent] = useState<FeedbackVerdict | null>(() =>
    typeof window === "undefined" ? null : readSentVerdict(investigationId)
  );
  const [pending, setPending] = useState<FeedbackVerdict | null>(null);
  const [note, setNote] = useState("");
  const send = useSendFeedback(investigationId);
  const problem = validateFeedback(note);

  function submit(verdict: FeedbackVerdict, text: string) {
    send.mutate(buildFeedback(verdict, text), {
      onSuccess: () => {
        rememberVerdict(investigationId, verdict);
        setSent(verdict);
        setPending(null);
        toast.success("Thanks, noted");
      },
      onError: () => toast.error("Could not send feedback"),
    });
  }

  if (sent) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={14}
          className="text-primary"
        />
        You marked this {sent === "partly" ? "partly helpful" : sent}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Was this useful?</span>
        {FEEDBACK_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant="chip"
            aria-pressed={pending === opt.value}
            size="xs"
            disabled={send.isPending}
            onClick={() =>
              opt.value === "helpful"
                ? submit(opt.value, "")
                : setPending(opt.value)
            }
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {pending && (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            autoFocus
            value={note}
            maxLength={MAX_FEEDBACK_NOTE + 50}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was off? (optional)"
            aria-label="Feedback note"
          />
          {problem && (
            <p role="alert" className="text-xs text-destructive">
              {problem}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="xs" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              size="xs"
              disabled={!!problem || send.isPending}
              onClick={() => submit(pending, note)}
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
