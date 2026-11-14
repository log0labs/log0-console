"use client";

import { useMemo, useState } from "react";

import { InvestigationView } from "@/components/investigations/investigation-view";
import { ReviewGate } from "@/components/investigations/review-gate";
import { Button } from "@/components/ui/button";
import { scenarios } from "@/lib/dev/investigation-fixtures";
import { pendingReview } from "@/lib/review";

export function InvestigationPreview() {
  const all = useMemo(() => scenarios(), []);
  const [key, setKey] = useState("completed");
  const { run, events } = all[key];
  const review = pendingReview(events);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-4">
      <div className="flex gap-1.5 overflow-x-auto">
        {Object.keys(all).map((k) => (
          <Button
            key={k}
            variant="chip"
            size="xs"
            aria-pressed={k === key}
            onClick={() => setKey(k)}
          >
            {k}
          </Button>
        ))}
      </div>
      <div className="rounded-xl border p-3.5">
        <InvestigationView
          key={key}
          run={run}
          events={events}
          state="live"
          gate={
            review && (
              <ReviewGate investigationId={run.id} review={review} canAnswer />
            )
          }
        />
      </div>
    </div>
  );
}
