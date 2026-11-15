import { Button } from "@/components/ui/button";
import { ConfidenceMeter } from "@/components/investigations/confidence-meter";
import { copyText } from "@/lib/clipboard";
import type { ConfidenceBand, RootCause } from "@/types/investigation";

function where(loc: RootCause["affectedLocations"][number]): string {
  return `${loc.filePath}${loc.line ? `:${loc.line}` : ""}`;
}

/** The answer: what is wrong, how sure we are, and where in the code. */
export function Verdict({
  rootCause,
  band,
}: {
  rootCause: RootCause;
  band: ConfidenceBand | null;
}) {
  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-primary/5 p-4 pl-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-primary" />
      {band && <ConfidenceMeter band={band} />}
      <p className="text-base leading-snug font-medium text-balance">
        {rootCause.statement}
      </p>
      {rootCause.affectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rootCause.affectedLocations.map((loc) => (
            <Button
              key={where(loc) + (loc.function ?? "")}
              variant="outline"
              size="xs"
              className="max-w-full font-mono"
              title="Copy path"
              onClick={() => void copyText(where(loc), "Path copied")}
            >
              <span className="truncate">{where(loc)}</span>
              {loc.function && (
                <span className="text-muted-foreground">{loc.function}</span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
