import { ArticleGridSkeleton } from "@/components/ui/Skeleton";

// ---------------------------------------------------------------------------
// Loading UI for the homepage segment
// ---------------------------------------------------------------------------

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="h-9 w-64 animate-pulse rounded bg-[color:var(--color-muted)]" />
        <div className="h-4 w-80 animate-pulse rounded bg-[color:var(--color-muted)]" />
      </header>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-7 w-20 shrink-0 animate-pulse rounded-full bg-[color:var(--color-muted)]"
          />
        ))}
      </div>
      <ArticleGridSkeleton />
    </div>
  );
}