import { links } from "@/lib/links";

/**
 * Coming-soon support notice shown above the auth forms while the hosted
 * log0 backend is being provisioned. The destination is a single link
 * (`links.support`), so it can be repointed without touching this file.
 */
export function SupportBanner() {
  return (
    <div
      role="status"
      className="rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        Coming soon
      </div>

      <p className="mt-1.5 text-sm text-muted-foreground">
        We are setting up a dedicated server for the log0 backend. You can
        support and speed up its development and deployment.
      </p>

      <a
        href={links.support}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Support on Ko-fi
      </a>
    </div>
  );
}
