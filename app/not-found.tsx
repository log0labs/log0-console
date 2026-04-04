import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-center">
      <p className="font-mono text-6xl font-bold text-muted-foreground/40">
        404
      </p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-md border px-4 py-2 text-sm transition-colors hover:bg-muted"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
