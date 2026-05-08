import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ArticleNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <p
        aria-hidden="true"
        className="text-6xl font-bold tracking-tight text-[color:var(--color-accent)]"
      >
        404
      </p>
      <h1 className="text-2xl font-semibold text-[color:var(--color-foreground)]">
        Article not found
      </h1>
      <p className="text-[color:var(--color-muted-foreground)]">
        The story you’re looking for has either been moved or never existed.
        Head back to the homepage to find something new to read.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-md bg-[color:var(--color-accent)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-foreground)] transition-opacity hover:opacity-90"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          Back to homepage
        </Link>
        <Link
          href="/?tag=technology"
          className="inline-flex items-center rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
        >
          Browse technology
        </Link>
      </div>
    </div>
  );
}