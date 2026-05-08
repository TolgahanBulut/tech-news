import { clsx } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Primitive
// ---------------------------------------------------------------------------

interface SkeletonProps {
  readonly className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "animate-pulse rounded bg-[color:var(--color-muted)]",
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// ArticleCardSkeleton — mirrors ArticleCard dimensions to prevent CLS
// ---------------------------------------------------------------------------

export function ArticleCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)]"
    >
      <Skeleton className="aspect-video w-full rounded-none" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />

        <div className="mt-auto flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>

        <div className="flex items-center gap-4 border-t border-[color:var(--color-border)] pt-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ArticleGridSkeleton — matches ArticleGrid layout, single live-region label
// ---------------------------------------------------------------------------

interface ArticleGridSkeletonProps {
  readonly count?: number;
}

export function ArticleGridSkeleton({ count = 12 }: ArticleGridSkeletonProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading articles…</span>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ArticleDetailSkeleton — for article/[slug]/loading.tsx
// ---------------------------------------------------------------------------

export function ArticleDetailSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="mx-auto max-w-3xl">
      <span className="sr-only">Loading article…</span>
      <Skeleton className="mb-4 h-5 w-24 rounded-full" />
      <Skeleton className="mb-3 h-10 w-full" />
      <Skeleton className="mb-6 h-10 w-4/5" />

      <div className="mb-8 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <Skeleton className="mb-8 aspect-video w-full" />

      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}