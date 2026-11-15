import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

/** What the run could not look at, so a missing source is never mistaken for a clean bill of health. */
export function GapsNotice({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) return null;
  return (
    <div className="flex gap-2.5 rounded-lg border border-severity-high/30 bg-severity-high/10 px-3 py-2.5 text-sm">
      <HugeiconsIcon
        icon={Alert02Icon}
        size={16}
        className="mt-0.5 shrink-0 text-severity-high"
      />
      <div className="min-w-0">
        <p className="font-medium text-severity-high">Not examined</p>
        <ul className="mt-0.5 text-muted-foreground">
          {gaps.map((g) => (
            <li key={g} className="break-words">
              {g}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
