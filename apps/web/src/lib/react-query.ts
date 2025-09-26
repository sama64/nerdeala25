"use client";

import { QueryClient } from "@tanstack/react-query";

import type { ApiError } from "@/lib/fetcher";

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

            if (typeof error === "object" && error && "statusCode" in error) {
              return (error as ApiError).statusCode >= 500;
            }

            return true;
          }
        }
      }
    });
  }
  return client;
}
