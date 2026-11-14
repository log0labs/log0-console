import { SectionLabel } from "@/components/ui/section-label";

/** A titled short list; renders nothing when there is nothing to list. */
export function BulletBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel>{title}</SectionLabel>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span
              aria-hidden
              className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60"
            />
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
