"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Dynamic Provider Wrapper
// ---------------------------------------------------------------------------

// Must live in a client component; Server Components can't use ssr:false
const ThemeProvider = dynamic(
  () => import("./ThemeProvider").then((mod) => mod.ThemeProvider),
  { ssr: false },
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  readonly children: ReactNode;
}

export function ThemeProviderClient({ children }: Props) {
  return <ThemeProvider>{children}</ThemeProvider>;
}