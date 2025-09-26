"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

interface CourseStudentsParams {
  courseId: string;
  page?: number;
  size?: number;
}

export interface CourseParticipant {
  id: string;
  google_user_id: string;
  email: string | null;
  full_name: string | null;
  photo_url: string | null;
  role: string;
  matched_user_id: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CourseParticipantsResponse {
  items: CourseParticipant[];
  pagination: {
    total: number;
    page: number;
    size: number;
  };
  course_id: string;
  filtered_role: string | null;
}

export function useCourseStudents(params: CourseStudentsParams) {
  const { courseId, page = 1, size = 20 } = params;
  
  const queryParams = new URLSearchParams({
    course_id: courseId,
    role: 'student', // Only get students
    page: page.toString(),
    size: size.toString(),
  });

  return useQuery({
    queryKey: ['course-participants', { courseId, role: 'student', page, size }],
    queryFn: () => apiGet<CourseParticipantsResponse>(`/api/v1/course-participants/?${queryParams}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!courseId, // Only run if courseId is provided
  });
}
