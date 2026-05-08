import { format, isValid, parseISO } from "date-fns";
import type { PaginationMeta } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Hard ceiling for excerpts. Aligns with most search engines' meta
 * description display window (~160 chars) so the same string serves
 * the card UI and SEO without compromise.
 */
const EXCERPT_MAX = 160;

/**
 * Average adult reading speed in words per minute.
 * 200 wpm is the conservative end of the published range (200–250) — we
 * round up via Math.ceil so the displayed estimate is never optimistic.
 */
const WORDS_PER_MINUTE = 200;

// ---------------------------------------------------------------------------
// Excerpt
// ---------------------------------------------------------------------------

/**
 * Build a card/SEO-ready excerpt from a body string.
 *
 * Behavior:
 * - Body shorter than the ceiling → returned verbatim, no ellipsis.
 * - Body longer → cut at the last word boundary within the ceiling so
 *   we never sever a word mid-character. Falls back to a hard cut if
 *   no whitespace is found in the window (e.g. one giant token).
 *
 * Whitespace is collapsed first so multi-line bodies don't produce
 * excerpts riddled with newlines.
 */
export function buildExcerpt(body: string, max: number = EXCERPT_MAX): string {
  const normalised = body.replace(/\s+/g, " ").trim();

  if (normalised.length <= max) return normalised;

  const window = normalised.slice(0, max);
  const lastSpace = window.lastIndexOf(" ");

  // If the window contains no whitespace, hard-cut. Otherwise trim back
  // to the last word boundary to avoid "comp…" mid-word severance.
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : window;

  return `${cut.trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Reading time
// ---------------------------------------------------------------------------

/**
 * Estimate reading time in minutes for a body of text.
 *
 * Uses Math.ceil so a 1-word post still reports "1 min read" — a 0-min
 * read is a confusing UI signal and would have to be special-cased
 * downstream anyway.
 */
export function computeReadingTime(
  body: string,
  wordsPerMinute: number = WORDS_PER_MINUTE,
): number {
  const wordCount = body
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  if (wordCount === 0) return 0;
  return Math.ceil(wordCount / wordsPerMinute);
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

interface BuildPaginationMetaInput {
  readonly currentPage: number;
  readonly totalItems: number;
  readonly pageSize: number;
}

/**
 * Derive page-centric pagination metadata from raw counts.
 *
 * Edge cases handled:
 * - totalItems === 0 → totalPages clamps to 1, both has*Page flags false.
 *   (Returning 0 pages would force every consumer to special-case it.)
 * - currentPage clamped to [1, totalPages] so a stale URL (?page=999)
 *   yields a sane meta rather than silently inconsistent flags.
 * - Exact division (e.g. 24 items, page size 12) → exactly 2 pages.
 */
export function buildPaginationMeta({
  currentPage,
  totalItems,
  pageSize,
}: BuildPaginationMetaInput): PaginationMeta {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const clampedCurrent = Math.min(Math.max(1, currentPage), totalPages);

  return {
    currentPage: clampedCurrent,
    totalPages,
    totalItems,
    pageSize: safePageSize,
    hasNextPage: clampedCurrent < totalPages,
    hasPrevPage: clampedCurrent > 1,
  };
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/**
 * Format an ISO date string for display ("MMM d, yyyy" → "Jan 1, 2025").
 *
 * Returns the original input on invalid dates rather than throwing. A
 * malformed date in metadata should not crash the article page; surfacing
 * the raw string is debuggable in the wild and won't hurt SEO.
 */
export function formatDate(iso: string): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso;
  return format(parsed, "MMM d, yyyy");
}

// ---------------------------------------------------------------------------
// Class name composition
// ---------------------------------------------------------------------------

/**
 * Minimal classnames helper.
 *
 * Accepts strings, falsy values (false / null / undefined), and ignores
 * them. Numbers are deliberately excluded — they almost always indicate
 * a bug in the call site (you meant a string class).
 *
 * Why not the `clsx` npm package: we use ~3% of its API surface. A 5-line
 * function is auditable, has no supply-chain cost, and is trivial to test.
 */
type ClassValue = string | false | null | undefined;

export function clsx(...values: ClassValue[]): string {
  return values.filter((v): v is string => typeof v === "string" && v.length > 0).join(" ");
}