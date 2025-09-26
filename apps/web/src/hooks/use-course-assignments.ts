"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

interface CourseAssignmentsParams {
  courseId: string;
  state?: string;
  page?: number;
  size?: number;
}

export interface CourseAssignment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  work_type: string | null;
  state: string | null;
  due_at: string | null;
  alternate_link: string | null;
  max_points: number | null;
  created_time: string | null;
  updated_time: string | null;
  assignee_mode: string | null;
  assignee_user_ids: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CourseAssignmentsResponse {
  items: CourseAssignment[];
  pagination: {
    total: number;
    page: number;
    size: number;
  };
  course_id: string;
  filtered_state: string | null;
}

export function useCourseAssignments(params: CourseAssignmentsParams) {
  const { courseId, state, page = 1, size = 20 } = params;
  
  const queryParams = new URLSearchParams({
    course_id: courseId,
    page: page.toString(),
    size: size.toString(),
  });

  if (state) {
    queryParams.set('state', state);
  }

  return useQuery({
    queryKey: ['course-assignments', { courseId, state, page, size }],
    queryFn: () => apiGet<CourseAssignmentsResponse>(`/api/v1/course-assignments/?${queryParams}`),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!courseId, // Only run if courseId is provided
  });
}
