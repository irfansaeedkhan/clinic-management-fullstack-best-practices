import { QueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";
import ms from "ms";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data stays fresh (no refetch)
      staleTime: ms("15s"),

      // How long unused data stays in cache
      gcTime: ms("5m"),

      // Retry network and server failures. A 4xx response will not succeed on retry.
      retry: (failureCount, error) => {
        if (error instanceof HTTPError && error.response.status < 500) {
          return false;
        }

        return failureCount < 5;
      },
    },
  },
});
