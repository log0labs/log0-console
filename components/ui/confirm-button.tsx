"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";

/** A delete icon that asks "Keep / Delete" in place before it does anything. */
export function ConfirmButton({
  label,
  onConfirm,
  pending = false,
  confirmLabel = "Delete",
}: {
  /** Accessible name, e.g. "Delete db-pool". */
  label: string;
  onConfirm: () => void;
  pending?: boolean;
  confirmLabel?: string;
}) {
  const [asking, setAsking] = useState(false);

  if (asking) {
    return (
      <div className="flex shrink-0 gap-1.5">
        <Button variant="ghost" size="xs" onClick={() => setAsking(false)}>
          Keep
        </Button>
        <Button
          variant="destructive"
          size="xs"
          disabled={pending}
          onClick={() => {
            onConfirm();
            setAsking(false);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      onClick={() => setAsking(true)}
    >
      <HugeiconsIcon icon={Delete02Icon} size={14} />
    </Button>
  );
}
