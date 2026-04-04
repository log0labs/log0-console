import { AuthInitializer } from "@/components/auth-initializer";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AuthInitializer />
      {/* Sidebar + topbar will go here */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
