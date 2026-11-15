import { cn } from "@/lib/utils";
import type { HypothesisItem } from "@/lib/timeline";

const DOT: Record<string, string> = {
  supported: "bg-primary",
  refuted: "bg-muted-foreground/40",
  open: "bg-severity-medium",
};
const ORDER: Record<string, number> = { supported: 0, open: 1, refuted: 2 };

/** What it considered: the supported cause first, ruled-out ideas dimmed with their evidence counts. */
export function HypothesisList({ items }: { items: HypothesisItem[] }) {
  const sorted = [...items].sort(
    (a, b) => (ORDER[a.status] ?? 1) - (ORDER[b.status] ?? 1) || a.seq - b.seq
  );
  if (sorted.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {sorted.map((h) => (
        <li key={h.id} className="flex items-start gap-2.5 px-3 py-2.5">
          <span
            aria-hidden
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              DOT[h.status] ?? DOT.open
            )}
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm break-words",
                h.status === "refuted" && "text-muted-foreground"
              )}
            >
              {h.statement}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {h.status} · {h.supporting} for · {h.contradicting} against
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
