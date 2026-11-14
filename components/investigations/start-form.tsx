"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStartInvestigation } from "@/hooks/use-investigations";
import {
  buildRequest,
  DEFAULT_SCOPE,
  MAX_QUESTION_LENGTH,
  SCOPE_OPTIONS,
  startErrorMessage,
  validateForm,
} from "@/lib/investigation-form";
import type { InvestigationScope } from "@/types/investigation";

interface StartFormProps {
  incidentId: string;
  onStarted: () => void;
  onCancel: () => void;
}

/** Ask for an investigation: an optional question and the sources it may use, as toggle chips. */
export function StartForm({ incidentId, onStarted, onCancel }: StartFormProps) {
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState<InvestigationScope>(DEFAULT_SCOPE);
  const start = useStartInvestigation(incidentId);
  const problem = validateForm(question, scope);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || start.isPending) return;
    start.mutate(buildRequest(question, scope), {
      onSuccess: onStarted,
      onError: (error) => toast.error(startErrorMessage(error)),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border p-3.5"
    >
      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={MAX_QUESTION_LENGTH + 100}
        rows={2}
        aria-label="Question (optional)"
        placeholder="Ask something specific, or leave empty to find the root cause"
      />

      <div
        role="group"
        aria-label="Sources it may use"
        className="flex flex-wrap gap-1.5"
      >
        {SCOPE_OPTIONS.map((option) => (
          <Button
            key={option.key}
            type="button"
            variant="chip"
            size="xs"
            aria-pressed={scope[option.key]}
            title={option.hint}
            onClick={() =>
              setScope((s) => ({ ...s, [option.key]: !s[option.key] }))
            }
          >
            {option.label}
          </Button>
        ))}
      </div>

      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!!problem || start.isPending}>
          {start.isPending ? "Starting…" : "Start"}
        </Button>
      </div>
    </form>
  );
}
