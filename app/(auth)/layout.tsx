import { BrandPanel } from "@/components/auth/brand-panel";

/*
  Split auth shell: form column (left, theme-aware) + brand panel (right, lg+).
  Collapses to a centered form below lg.
*/
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <BrandPanel />
    </div>
  );
}
