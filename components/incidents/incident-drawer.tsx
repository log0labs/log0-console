"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

import { IncidentDetail } from "./incident-detail";

export function IncidentDrawer({ incidentId }: { incidentId: string }) {
  const router = useRouter();

  const close = useCallback(() => router.push("/incidents"), [router]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={close}
        aria-hidden
      />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-background shadow-xl sm:w-[640px] sm:max-w-[92vw] lg:w-[720px]">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
          <span className="text-sm font-medium text-muted-foreground">
            Incident detail
          </span>
          <button
            onClick={close}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <IncidentDetail incidentId={incidentId} />
        </div>
      </aside>
    </>
  );
}
