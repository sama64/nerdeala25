"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { Course } from "@/types";

export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => apiGet<Course>(`/api/v1/courses/${courseId}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!courseId, // Only run if courseId is provided
  });
}
