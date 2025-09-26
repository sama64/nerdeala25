"use client";

import { QueryClient } from "@tanstack/react-query";

let client: QueryClient | null = null;

export function getQueryClient() {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60,
          refetchOnWindowFocus: false,
          retry: (failureCount, error) => {
            if (failureCount >= 3) return false;
            return !("status" in (error as never)) || (error as never).status >= 500;
          }
        }
      }
    });
  }
  return client;
}
