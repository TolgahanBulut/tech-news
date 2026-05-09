import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProviderClient } from "@/components/layout/ThemeProviderClient";
import { Navbar } from "@/components/layout/Navbar";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

// ---------------------------------------------------------------------------
// Font
// ---------------------------------------------------------------------------

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// ---------------------------------------------------------------------------
// Site-wide metadata
// ---------------------------------------------------------------------------

const SITE_URL = "https://techpulse.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TechPulse — Tech News",
    template: "%s | TechPulse",
  },
  description:
    "Breaking technology news, deep dives, and analysis — fast, focused, no fluff.",
  applicationName: "TechPulse",
  openGraph: {
    type: "website",
    siteName: "TechPulse",
    title: "TechPulse — Tech News",
    description:
      "Breaking technology news, deep dives, and analysis — fast, focused, no fluff.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "TechPulse — Tech News",
    description:
      "Breaking technology news, deep dives, and analysis — fast, focused, no fluff.",
  },
  robots: { index: true, follow: true },
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <QueryProvider>
          <ThemeProviderClient>
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
              {children}
            </main>
          </ThemeProviderClient>
        </QueryProvider>
      </body>
    </html>
  );
}