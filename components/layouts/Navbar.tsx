"use client";

import Link from "next/link";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "./ThemeProvider";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Navbar() {
  const { theme, toggle } = useTheme();

  const isReady = theme !== null;
  const isDark = theme === "dark";

  const label = !isReady
    ? "Theme toggle"
    : isDark
      ? "Switch to light theme"
      : "Switch to dark theme";

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-[color:var(--color-background)]/80 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[color:var(--color-foreground)] hover:text-[color:var(--color-accent)]"
        >
          TechPulse
        </Link>

        <button
          type="button"
          onClick={toggle}
          disabled={!isReady}
          aria-label={label}
          aria-pressed={isDark}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border)] text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)] disabled:opacity-60"
        >
          {isReady ? (
            isDark ? (
              <SunIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <MoonIcon className="h-5 w-5" aria-hidden="true" />
            )
          ) : (
            // keep size stable before theme resolves (avoid CLS)
            <span aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </nav>
    </header>
  );
}