"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { useAuth } from "@/components/auth-provider";
import type { Course, ApiListResponse } from "@/types";

export interface CourseListParams {
  page?: number;
  size?: number;
  teacherId?: string;
}

export interface CourseListResponse extends ApiListResponse<Course> {
  pagination: {
    total: number;
    page: number;
    size: number;
  };
}

export function useCourses(params: CourseListParams = {}) {
  const { page = 1, size = 20, teacherId } = params;
  const { isDemoMode, demoRole, getDemoCourses } = useDemoMode();
  const { user } = useAuth();
  
  // Use demo role if in demo mode, otherwise use actual user role
  const effectiveRole = isDemoMode ? demoRole : user?.role;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });

  if (teacherId) {
    queryParams.set('teacher_id', teacherId);
  }

  return useQuery({
    queryKey: ['courses', { page, size, teacherId, demoMode: isDemoMode }],
    queryFn: async () => {
      console.log('useCourses queryFn called:', { isDemoMode, userRole: user?.role });
      
      if (isDemoMode && effectiveRole) {
        console.log('Using demo mode, getting demo courses for role:', effectiveRole);
        // Return mock data in demo mode
        const demoCourses = getDemoCourses(effectiveRole);
        console.log('Demo courses retrieved:', demoCourses);
        
        const response = {
          items: demoCourses,
          pagination: {
            total: demoCourses.length,
            page: 1,
            size: demoCourses.length,
          }
        } as CourseListResponse;
        
        console.log('Returning demo response:', response);
        return response;
      }

      console.log('Using normal API call');
      // Normal API call
      return apiGet<CourseListResponse>(`/api/v1/courses/?${queryParams}`);
    },
    staleTime: isDemoMode ? Infinity : 5 * 60 * 1000, // Never stale in demo mode
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
