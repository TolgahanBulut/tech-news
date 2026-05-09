"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllTags } from "@/lib/api";
import { clsx } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TagFilterProps {
  // Server-rendered initial tags passed as prop; React Query revalidates
  // client-side after the ISR window (300s) via lib/api.ts — no direct
  // fetch calls in the component.
  readonly initialTags: readonly string[];
  readonly activeTag?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TagFilter({ initialTags, activeTag }: TagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Uses getAllTags from lib/api.ts — respects the "no direct fetch in
  // components" boundary. placeholderData shows server tags instantly;
  // React Query revalidates after staleTime matches the ISR window.
  const { data: tags = initialTags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => getAllTags(),
    placeholderData: initialTags as string[],
    staleTime: 5 * 60 * 1000,
  });

  const navigate = useCallback(
    (nextTag: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTag) params.set("tag", nextTag);
      else params.delete("tag");
      // tag change always resets pagination
      params.delete("page");

      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;

      startTransition(() => {
        router.push(url, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <div
      role="group"
      aria-label="Filter by tag"
      className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
    >
      <TagPill
        label="All"
        active={!activeTag}
        onClick={() => navigate(null)}
      />
      {tags.map((tag) => (
        <TagPill
          key={tag}
          label={tag}
          active={tag === activeTag}
          onClick={() => navigate(tag)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TagPill — internal
// ---------------------------------------------------------------------------

interface TagPillProps {
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
}

function TagPill({ label, active, onClick }: TagPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
        active
          ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
          : "border-[color:var(--color-border)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
      )}
    >
      {label}
    </button>
  );
}