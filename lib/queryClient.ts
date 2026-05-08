import { QueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Factory — one QueryClient per browser session, fresh instance per SSR pass
// ---------------------------------------------------------------------------

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Match the ISR window so client and server agree on freshness.
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}