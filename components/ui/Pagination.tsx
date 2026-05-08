"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useMemo } from "react";
import type { PaginationMeta } from "@/types";
import { clsx } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PaginationProps {
  readonly meta: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Page-list builder
// ---------------------------------------------------------------------------

type PageItem = number | "ellipsis-left" | "ellipsis-right";

// 7-slot window: first, [maybe …], current-1, current, current+1, [maybe …], last
function buildPageList(current: number, total: number): readonly PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: PageItem[] = [1];
  const leftBoundary = Math.max(2, current - 1);
  const rightBoundary = Math.min(total - 1, current + 1);

  if (leftBoundary > 2) items.push("ellipsis-left");
  for (let p = leftBoundary; p <= rightBoundary; p++) items.push(p);
  if (rightBoundary < total - 1) items.push("ellipsis-right");

  items.push(total);
  return items;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Pagination({ meta }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page === 1) params.delete("page");
      else params.set("page", String(page));

      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(url, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const pages = useMemo(
    () => buildPageList(meta.currentPage, meta.totalPages),
    [meta.currentPage, meta.totalPages],
  );

  if (meta.totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-1"
    >
      <PageButton
        onClick={() => navigate(meta.currentPage - 1)}
        disabled={!meta.hasPrevPage}
        ariaLabel="Previous page"
      >
        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
      </PageButton>

      {pages.map((item, index) => {
        if (item === "ellipsis-left" || item === "ellipsis-right") {
          return <Ellipsis key={`${item}-${index}`} />;
        }
        return (
          <PageButton
            key={item}
            onClick={() => navigate(item)}
            active={item === meta.currentPage}
            ariaLabel={`Page ${item}`}
            ariaCurrent={item === meta.currentPage ? "page" : undefined}
          >
            {item}
          </PageButton>
        );
      })}

      <PageButton
        onClick={() => navigate(meta.currentPage + 1)}
        disabled={!meta.hasNextPage}
        ariaLabel="Next page"
      >
        <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
      </PageButton>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// PageButton — internal
// ---------------------------------------------------------------------------

interface PageButtonProps {
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly active?: boolean;
  readonly ariaLabel: string;
  readonly ariaCurrent?: "page";
  readonly children: React.ReactNode;
}

function PageButton({
  onClick,
  disabled,
  active,
  ariaLabel,
  ariaCurrent,
  children,
}: PageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={clsx(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
          : "border-[color:var(--color-border)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Ellipsis — non-interactive, accessible label
// ---------------------------------------------------------------------------

function Ellipsis() {
  return (
    <span className="inline-flex h-9 min-w-9 items-center justify-center px-2 text-sm text-[color:var(--color-muted-foreground)]">
      <span aria-hidden="true">…</span>
      <span className="sr-only">More pages</span>
    </span>
  );
}