"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TagFilterProps {
  // Server-rendered initial tags passed as prop; React Query keeps them
  // fresh client-side without a server round-trip on every navigation.
  readonly initialTags: readonly string[];
  readonly activeTag?: string;
}

// ---------------------------------------------------------------------------
// Client-side tags fetcher
// ---------------------------------------------------------------------------

async function fetchTags(): Promise<string[]> {
  const res = await fetch("https://dummyjson.com/posts/tag-list");
  if (!res.ok) throw new Error(`Failed to fetch tags: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.tags ?? [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TagFilter({ initialTags, activeTag }: TagFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // initialTags from server render is used as placeholder data so the
  // filter is immediately visible. React Query revalidates in the background
  // after 5 minutes (matches ISR window), keeping the tag list fresh without
  // a server round-trip on every client navigation.
  const { data: tags = initialTags } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    placeholderData: initialTags as string[],
    staleTime: 5 * 60 * 1000, // matches ISR revalidate window
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