"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { useDemoMode } from "@/hooks/use-demo-mode";

interface CourseInfo {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SummaryMetrics {
  total_students: number;
  total_assignments: number;
  total_submissions: number;
  submitted_count: number;
  draft_count: number;
  late_submissions: number;
  participation_rate: number;
  completion_rate: number;
  attendance_rate: number;
}

interface AssignmentAnalysis {
  id: string;
  title: string;
  due_at: string | null;
  max_points: number | null;
  submission_rate: number;
  total_submissions: number;
  submitted_count: number;
  draft_count: number;
  late_count: number;
  average_grade: number | null;
  graded_count: number;
}

interface StudentSummary {
  id: string;
  google_user_id: string;
  name: string | null;
  email: string | null;
  total_submissions: number;
  completed_submissions: number;
  attendance_rate: number;
  performance_score: number;
}

interface Alert {
  type: string;
  message: string;
  severity: string;
  student_id?: string;
  assignment_id?: string;
}

interface Recommendation {
  type: string;
  message: string;
  action: string;
}

interface CourseReport {
  course_info: CourseInfo;
  summary_metrics: SummaryMetrics;
  assignments_analysis: {
    assignments: AssignmentAnalysis[];
    best_performing: AssignmentAnalysis[];
    worst_performing: AssignmentAnalysis[];
  };
  students_overview: {
    students: StudentSummary[];
    top_performers: StudentSummary[];
    at_risk_students: StudentSummary[];
  };
  attendance_analysis?: {
    available: boolean;
    overall_rate?: number;
    total_sessions?: number;
    average_attendance?: number;
    students_with_perfect_attendance?: number;
    students_with_attendance_issues?: number;
  };
  temporal_trends?: {
    upcoming_deadlines: number;
    next_deadline: string | null;
    recent_activity: number;
    trend_analysis: string;
  };
  alerts_and_recommendations: {
    alerts: Alert[];
    recommendations: Recommendation[];
    summary: {
      total_alerts: number;
      high_priority: number;
      students_at_risk: number;
    };
  };
  recent_activity: {
    notifications: Array<{
      id: string;
      type: string;
      message: string;
      created_at: string | null;
      status: string;
    }>;
  };
}

interface CourseReportResponse {
  report: CourseReport;
  generated_at: string;
  generated_by: string;
}

interface UseCourseReportParams {
  courseId: string;
  includeDetailedStudents?: boolean;
  includeAttendance?: boolean;
  includeTemporal?: boolean;
}

// Mock data generator for demo mode
function generateMockReport(courseId: string): CourseReportResponse {
  const courseNames: Record<string, string> = {
    "demo-math-101": "Matemáticas Avanzadas",
    "demo-physics-201": "Física Cuántica",
    "demo-chemistry-101": "Química Orgánica",
    "demo-biology-301": "Biología Molecular",
    "demo-literature-101": "Literatura Contemporánea",
    "demo-history-201": "Historia Universal",
  };

  const courseName = courseNames[courseId] || "Curso Demo";

  return {
    report: {
      course_info: {
        id: courseId,
        name: courseName,
        description: `Descripción del curso ${courseName}`,
        teacher_id: "demo-teacher-1",
        created_at: "2024-09-01T10:00:00Z",
        updated_at: "2024-09-26T10:00:00Z",
      },
      summary_metrics: {
        total_students: Math.floor(Math.random() * 25) + 15, // 15-40 students
        total_assignments: Math.floor(Math.random() * 8) + 5, // 5-12 assignments
        total_submissions: Math.floor(Math.random() * 200) + 100,
        submitted_count: Math.floor(Math.random() * 150) + 80,
        draft_count: Math.floor(Math.random() * 30) + 10,
        late_submissions: Math.floor(Math.random() * 20) + 5,
        participation_rate: Math.random() * 30 + 70, // 70-100%
        completion_rate: Math.random() * 25 + 75, // 75-100%
        attendance_rate: Math.random() * 20 + 80, // 80-100%
      },
      assignments_analysis: {
        assignments: [],
        best_performing: [],
        worst_performing: [],
      },
      students_overview: {
        students: [],
        top_performers: [],
        at_risk_students: [],
      },
      attendance_analysis: {
        available: true,
        overall_rate: Math.random() * 20 + 80,
        total_sessions: Math.floor(Math.random() * 20) + 15,
        average_attendance: Math.random() * 15 + 85,
        students_with_perfect_attendance: Math.floor(Math.random() * 8) + 2,
        students_with_attendance_issues: Math.floor(Math.random() * 5) + 1,
      },
      temporal_trends: {
        upcoming_deadlines: Math.floor(Math.random() * 5) + 1,
        next_deadline: "2024-10-15T23:59:00Z",
        recent_activity: Math.floor(Math.random() * 15) + 5,
        trend_analysis: "positive",
      },
      alerts_and_recommendations: {
        alerts: [
          {
            type: "Participación Baja",
            message: "3 estudiantes no han entregado las últimas 2 tareas",
            severity: "medium",
          },
          {
            type: "Fecha Límite Próxima",
            message: "La tarea 'Examen Parcial' vence en 3 días",
            severity: "high",
          },
        ],
        recommendations: [
          {
            type: "Intervención Temprana",
            message: "Considera contactar a estudiantes con baja participación",
            action: "Enviar recordatorio personalizado",
          },
          {
            type: "Extensión de Plazo",
            message: "Muchos estudiantes tienen entregas pendientes",
            action: "Evaluar extensión de 2 días en la próxima tarea",
          },
        ],
        summary: {
          total_alerts: 2,
          high_priority: 1,
          students_at_risk: 3,
        },
      },
      recent_activity: {
        notifications: [
          {
            id: "demo-notif-1",
            type: "submission",
            message: "Nueva entrega recibida para Tarea 5",
            created_at: "2024-09-26T09:30:00Z",
            status: "sent",
          },
          {
            id: "demo-notif-2",
            type: "reminder",
            message: "Recordatorio enviado: Fecha límite próxima",
            created_at: "2024-09-26T08:00:00Z",
            status: "sent",
          },
        ],
      },
    },
    generated_at: new Date().toISOString(),
    generated_by: "demo-user",
  };
}

export function useCourseReport({
  courseId,
  includeDetailedStudents = false,
  includeAttendance = true,
  includeTemporal = true,
}: UseCourseReportParams) {
  const { isDemoMode } = useDemoMode();

  const queryParams = new URLSearchParams({
    include_detailed_students: includeDetailedStudents.toString(),
    include_attendance: includeAttendance.toString(),
    include_temporal: includeTemporal.toString(),
  });

  return useQuery({
    queryKey: ['course-report', { courseId, includeDetailedStudents, includeAttendance, includeTemporal, demoMode: isDemoMode }],
    queryFn: async () => {
      if (isDemoMode) {
        // Return mock data in demo mode
        return generateMockReport(courseId);
      }

      // Normal API call
      return apiGet<CourseReportResponse>(`/api/v1/course-reports/${courseId}/comprehensive?${queryParams}`);
    },
    staleTime: isDemoMode ? Infinity : 5 * 60 * 1000, // Never stale in demo mode
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!courseId,
  });
}

// Export CSV functionality
export function useCourseReportExport(courseId: string) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCsv = async () => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      
      if (token) {
        const downloadUrl = `/api/v1/course-reports/${courseId}/export-csv?token=${encodeURIComponent(token)}`;
        
        // Method 1: Direct window.open
        window.open(downloadUrl, '_blank');
        
        // Method 2: Programmatic link as backup
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `reporte_curso_${courseId}.csv`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 500);
        
      } else {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      return { success: true, filename: `reporte_curso_${courseId}.csv` };
    } catch (error) {
      console.error('Error exporting course report CSV:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToCsv,
    isExporting,
  };
}

// Export types for use in components
export type {
  CourseReport,
  CourseReportResponse,
  SummaryMetrics,
  AssignmentAnalysis,
  StudentSummary,
  Alert,
  Recommendation,
};
