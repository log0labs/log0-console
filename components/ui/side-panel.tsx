"use client";

import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A panel that slides over the page from the right: a dimmed backdrop, Escape and the X close it, and the
 * header carries a title plus any action icons. Full screen on a phone. One shell for every detail view.
 */
export function SidePanel({
  title,
  onClose,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  onClose: () => void;
  /** Icon buttons shown in the header, left of the close button. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={typeof title === "string" ? title : undefined}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l bg-background shadow-xl sm:w-[640px] sm:max-w-[92vw] lg:w-[720px]",
          className
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            {actions}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}
