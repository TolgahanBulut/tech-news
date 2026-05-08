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

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // digest is a short hash matching the server log entry
    console.error("[TechPulse] root error", { digest: error.digest });
  }, [error]);

  return (
    <div className="py-16">
      <ErrorMessage
        title="We hit a snag loading TechPulse"
        description="The newsroom is back online in a moment. Try again."
        onRetry={reset}
      />
    </div>
  );
}