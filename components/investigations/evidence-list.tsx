"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SecurityCheckIcon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { evidenceKindBadge } from "@/lib/theme/tokens";
import type { EvidenceItem } from "@/lib/timeline";

/** Evidence the run collected. By default only what the root cause cites; a toggle shows all of it. */
export function EvidenceList({
  items,
  citedIds,
}: {
  items: EvidenceItem[];
  citedIds: string[];
}) {
  const cited = new Set(citedIds);
  const hasCited = items.some((e) => cited.has(e.id));
  const [all, setAll] = useState(!hasCited);
  const shown = all ? items : items.filter((e) => cited.has(e.id));
  const citedCount = items.filter((e) => cited.has(e.id)).length;

  return (
    <div className="flex flex-col gap-2">
      {hasCited && (
        <div role="group" aria-label="Which evidence" className="flex gap-1.5">
          {[
            { all: false, label: `Cited ${citedCount}` },
            { all: true, label: `All ${items.length}` },
          ].map((opt) => (
            <Button
              key={opt.label}
              variant="chip"
              size="xs"
              aria-pressed={all === opt.all}
              onClick={() => setAll(opt.all)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}
      <ul className="flex flex-col divide-y rounded-lg border">
        {shown.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 px-3 py-2.5">
            <Badge
              variant="outline"
              className={cn(
                "mt-0.5 shrink-0",
                evidenceKindBadge[item.kind] ?? evidenceKindBadge.doc
              )}
            >
              {item.kind}
            </Badge>
            <p className="min-w-0 flex-1 text-sm break-words">
              {item.summary || (
                <span className="font-mono text-xs text-muted-foreground">
                  {item.id}
                </span>
              )}
            </p>
            {item.redacted > 0 && (
              <span
                className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                title={`${item.redacted} sensitive value(s) hidden before analysis`}
              >
                <HugeiconsIcon icon={SecurityCheckIcon} size={13} />
                {item.redacted}
              </span>
            )}
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted-foreground">
            No evidence recorded.
          </li>
        )}
      </ul>
    </div>
  );
}
