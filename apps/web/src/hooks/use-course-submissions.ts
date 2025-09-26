"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

interface CourseSubmissionsParams {
  courseId: string;
  courseworkId?: string;
  googleUserId?: string;
  page?: number;
  size?: number;
}

export interface CourseSubmission {
  id: string;
  course_id: string;
  coursework_id: string;
  google_user_id: string;
  matched_user_id: string | null;
  state: string;
  late: boolean;
  turned_in_at: string | null;
  assigned_grade: number | null;
  draft_grade: number | null;
  attachments: any[] | null;
  updated_time: string | null;
  created_at: string;
  updated_at: string;
}

interface CourseSubmissionsResponse {
  items: CourseSubmission[];
  count: number;
}

export function useCourseSubmissions(params: CourseSubmissionsParams) {
  const { courseId, courseworkId, googleUserId, page = 1, size = 50 } = params;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });

  if (courseworkId) {
    queryParams.set('coursework_id', courseworkId);
  }

  if (googleUserId) {
    queryParams.set('google_user_id', googleUserId);
  }

  return useQuery({
    queryKey: ['course-submissions', { courseId, courseworkId, googleUserId, page, size }],
    queryFn: () => apiGet<CourseSubmissionsResponse>(`/api/v1/classroom/${courseId}/submissions?${queryParams}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!courseId, // Only run if courseId is provided
  });
}