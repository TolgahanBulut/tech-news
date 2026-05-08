"use client";

import { useEffect } from "react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

// ---------------------------------------------------------------------------
// Props — Next.js error boundary contract
// ---------------------------------------------------------------------------

interface ErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ArticleError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[TechPulse] article error", { digest: error.digest });
  }, [error]);

  return (
    <div className="py-16">
      <ErrorMessage
        title="Couldn’t load this article"
        description="An upstream hiccup. The article is probably fine — try again."
        onRetry={reset}
      />
    </div>
  );
}