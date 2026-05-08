"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = "light" | "dark";

interface ThemeContextValue {
  /**
   * The active theme, or null until the provider has mounted and resolved
   * the user's preference. Consumers MUST handle the null case to avoid
   * rendering a wrong-theme flash on first paint.
   */
  readonly theme: Theme | null;
  readonly toggle: () => void;
  readonly setTheme: (theme: Theme) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "techpulse:theme";

/**
 * Read the persisted theme. Wrapped in try/catch because localStorage
 * throws in private-browsing modes on some Safari versions and inside
 * sandboxed iframes — we don't want a storage exception to crash the
 * provider on mount.
 */
function readStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : null;
  } catch {
    return null;
  }
}

function readSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Apply the theme to <html>. We toggle a `dark` class because Tailwind v4
 * is configured (in globals.css) with `@custom-variant dark` keyed on
 * that class — the same convention as the wider Tailwind ecosystem so
 * future maintainers don't have to relearn the rule.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  // Also set color-scheme so native form controls and scrollbars match.
  root.style.colorScheme = theme;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ThemeProviderProps {
  readonly children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Start as null so SSR/initial render doesn't commit to a theme.
  // We resolve to a concrete value in the mount effect below.
  const [theme, setThemeState] = useState<Theme | null>(null);

  // Mount: resolve theme from storage → system, apply it, mark ready.
  useEffect(() => {
    const resolved = readStoredTheme() ?? readSystemTheme();
    applyTheme(resolved);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(resolved);
  }, []);

  // Listen for system theme changes — only honored when the user hasn't
  // explicitly picked one (i.e. nothing in localStorage). Once they
  // override, we respect that and stop following the OS.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (event: MediaQueryListEvent) => {
      if (readStoredTheme() !== null) return;
      const next: Theme = event.matches ? "dark" : "light";
      applyTheme(next);
      setThemeState(next);
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode / disabled storage — theme still works for the
      // session, just won't persist. Acceptable degradation.
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((current) => {
      // Resolve from DOM if state is still null on first toggle (e.g.
      // user clicks before mount effect fires — extremely unlikely but
      // cheap to guard against).
      const resolved =
        current ??
        (document.documentElement.classList.contains("dark")
          ? "dark"
          : "light");
      const next: Theme = resolved === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* see setTheme */
      }
      return next;
    });
  }, []);

  // Memoise the context value so consumers re-render only when theme
  // actually changes, not on every parent re-render.
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the active theme and setters.
 *
 * Throws if used outside <ThemeProvider> — a deliberate fail-fast so a
 * misplaced hook surfaces in development rather than silently rendering
 * the wrong theme.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}