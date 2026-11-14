"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const components: Components = {
  h1: (p) => (
    <h1 className="mt-5 mb-2 text-xl font-semibold first:mt-0" {...p} />
  ),
  h2: (p) => (
    <h2 className="mt-5 mb-2 text-lg font-semibold first:mt-0" {...p} />
  ),
  h3: (p) => (
    <h3 className="mt-4 mb-1.5 text-base font-semibold first:mt-0" {...p} />
  ),
  h4: (p) => (
    <h4 className="mt-3 mb-1 text-sm font-semibold first:mt-0" {...p} />
  ),
  p: (p) => <p className="my-2 leading-relaxed" {...p} />,
  ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5" {...p} />,
  ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5" {...p} />,
  a: (p) => (
    <a
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer nofollow"
      {...p}
    />
  ),
  blockquote: (p) => (
    <blockquote className="my-3 border-l-2 pl-3 text-muted-foreground" {...p} />
  ),
  code: ({ className, ...p }) => (
    <code
      className={cn(
        "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]",
        className
      )}
      {...p}
    />
  ),
  pre: (p) => (
    <pre
      className="my-3 overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs [&_code]:bg-transparent [&_code]:p-0"
      {...p}
    />
  ),
  table: (p) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...p} />
    </div>
  ),
  th: (p) => <th className="border px-2 py-1 text-left font-medium" {...p} />,
  td: (p) => <td className="border px-2 py-1" {...p} />,
  hr: () => <hr className="my-4" />,
};

/** Renders Markdown with the console's styling. Raw HTML in the text is never rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
