"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

/** Ask for an investigation: an optional question and the sources it may use. */
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
      className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="investigation-question">
          Question <span className="text-muted-foreground">(optional)</span>
        </Label>
        <textarea
          id="investigation-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={MAX_QUESTION_LENGTH + 100}
          rows={3}
          placeholder="What do you want to know? Leave empty to find the root cause."
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs text-muted-foreground">
          Sources it may use
        </legend>
        {SCOPE_OPTIONS.map((option) => (
          <label key={option.key} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={scope[option.key]}
              onChange={(e) =>
                setScope((s) => ({ ...s, [option.key]: e.target.checked }))
              }
              className="mt-0.5 accent-primary"
            />
            <span>
              {option.label}
              <span className="ml-2 text-xs text-muted-foreground">
                {option.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

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
          {start.isPending ? "Starting…" : "Start investigation"}
        </Button>
      </div>
    </form>
  );
}
