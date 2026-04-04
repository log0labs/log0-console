"use client";

import { useEffect } from "react";

export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-12 text-center">
      <p className="font-mono text-4xl font-bold text-muted-foreground/40">!</p>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}
