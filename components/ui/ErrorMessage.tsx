"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ErrorMessageProps {
  readonly title?: string;
  readonly description?: string;
  readonly onRetry?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ErrorMessage({
  title = "Something went wrong",
  description = "We couldn’t load this content. Please try again.",
  onRetry,
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-6 text-center"
    >
      <ExclamationTriangleIcon
        className="h-8 w-8 text-[color:var(--color-accent)]"
        aria-hidden="true"
      />
      <h2 className="text-base font-semibold text-[color:var(--color-foreground)]">
        {title}
      </h2>
      <p className="text-sm text-[color:var(--color-muted-foreground)]">
        {description}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-[color:var(--color-border)] px-3 py-1.5 text-sm font-medium hover:bg-[color:var(--color-background)]"
        >
          Try again
        </button>
      )}
    </div>
  );
}