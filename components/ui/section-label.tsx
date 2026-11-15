import * as React from "react";

import { cn } from "@/lib/utils";

/** The small uppercase heading above a block of content. One component, used everywhere. */
function SectionLabel({
  className,
  children,
  aside,
  ...props
}: React.ComponentProps<"div"> & { aside?: React.ReactNode }) {
  return (
    <div
      data-slot="section-label"
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    >
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {children}
      </p>
      {aside}
    </div>
  );
}

export { SectionLabel };
