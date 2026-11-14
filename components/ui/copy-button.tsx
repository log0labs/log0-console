"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";

/** Icon button that copies `text` and shows a tick for a moment. */
export function CopyButton({
  text,
  what,
  label = "Copy",
}: {
  text: string;
  what?: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      onClick={async () => {
        await copyText(text, what);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      <HugeiconsIcon icon={done ? Tick02Icon : Copy01Icon} size={14} />
    </Button>
  );
}
