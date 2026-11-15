import { cn } from "@/lib/utils";

/** The frame of a question the run is waiting on ("Your call"): title, a few facts on the right, then the body. */
export function GateCard({
  label,
  title = "Your call",
  aside,
  className,
  children,
}: {
  label: string;
  title?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-severity-high/40 bg-severity-high/10 p-3.5",
        className
      )}
      role="group"
      aria-label={label}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-severity-high">{title}</p>
        {aside && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {aside}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
