import { cn } from "@/lib/utils";
import type { ConfidenceBand } from "@/types/investigation";

const FILLED: Record<ConfidenceBand, number> = { low: 1, medium: 2, high: 3 };
const TONE: Record<ConfidenceBand, string> = {
  low: "bg-severity-high",
  medium: "bg-severity-medium",
  high: "bg-primary",
};

/** Three bars: how sure the deterministic rule is (never the model's own claim). */
export function ConfidenceMeter({ band }: { band: ConfidenceBand }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-xs text-muted-foreground"
      title="Set by a rule over the evidence, not by the model"
    >
      <span className="flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "w-1.5 rounded-sm",
              n === 1 ? "h-2" : n === 2 ? "h-3" : "h-4",
              n <= FILLED[band] ? TONE[band] : "bg-border"
            )}
          />
        ))}
      </span>
      <span className="font-medium text-foreground capitalize">{band}</span>
      confidence
    </span>
  );
}
