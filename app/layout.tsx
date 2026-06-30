import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import GrainBackgroundOverlay from "@/components/grain-overlay";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://console.log0.in"
  ),
  title: "log0 console",
  description:
    "Live incident console for log0 - detect, correlate and resolve in real time.",
  openGraph: {
    title: "log0 console - your incidents, triaged",
    description:
      "Live incident console for log0 - detect, correlate and resolve in real time.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "log0 console" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "log0 console - your incidents, triaged",
    description:
      "Live incident console for log0 - detect, correlate and resolve in real time.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
          <GrainBackgroundOverlay />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
