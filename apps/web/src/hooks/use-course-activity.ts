"use client";

import { useMemo } from "react";
import { useCourseSubmissions } from "./use-course-submissions";
import { useCourseAssignments } from "./use-course-assignments";
import { useCourseStudents } from "./use-course-students";

export interface ActivityItem {
  type: 'submission' | 'deadline_soon' | 'deadline_overdue';
  id: string;
  title: string;
  description: string;
  timestamp: string;
  student?: {
    name: string;
    email?: string;
  };
  assignment?: {
    title: string;
    dueDate?: string;
  };
  metadata?: {
    isLate?: boolean;
    grade?: number;
    daysUntilDue?: number;
  };
}

interface UseCourseActivityParams {
  courseId: string;
}

export function useCourseActivity({ courseId }: UseCourseActivityParams) {
  const { data: submissions, isLoading: submissionsLoading } = useCourseSubmissions({
    courseId,
    size: 20
  });

  const { data: assignments, isLoading: assignmentsLoading } = useCourseAssignments({
    courseId,
    size: 50
  });

  const { data: students, isLoading: studentsLoading } = useCourseStudents({
    courseId,
    size: 100
  });

  const activity = useMemo(() => {
    if (!submissions?.items || !assignments?.items || !students?.items) {
      return [];
    }

    const activities: ActivityItem[] = [];
    const now = new Date();

    // Create lookups for efficiency
    const assignmentMap = new Map(assignments.items.map(a => [a.id, a]));
    const studentMap = new Map(students.items.map(s => [s.google_user_id, s]));

    // Add recent submissions (last 7 days)
    const recentSubmissions = submissions.items
      .filter(sub => {
        const turnedInAt = sub.turned_in_at ? new Date(sub.turned_in_at) : null;
        if (!turnedInAt) return false;
        const daysDiff = (now.getTime() - turnedInAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => {
        const aDate = new Date(a.turned_in_at!);
        const bDate = new Date(b.turned_in_at!);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, 10);

    for (const submission of recentSubmissions) {
      const assignment = assignmentMap.get(submission.coursework_id);
      const student = studentMap.get(submission.google_user_id);

      if (assignment && student) {
        activities.push({
          type: 'submission',
          id: submission.id,
          title: `Entrega de ${assignment.title}`,
          description: `${student.full_name || 'Estudiante'} entregó la tarea`,
          timestamp: submission.turned_in_at!,
          student: {
            name: student.full_name || 'Sin nombre',
            email: student.email || undefined,
          },
          assignment: {
            title: assignment.title,
            dueDate: assignment.due_at || undefined,
          },
          metadata: {
            isLate: submission.late,
            grade: submission.assigned_grade || undefined,
          },
        });
      }
    }

    // Add upcoming deadlines (next 7 days)
    const upcomingDeadlines = assignments.items
      .filter(assignment => {
        if (!assignment.due_at) return false;
        const dueDate = new Date(assignment.due_at);
        const daysDiff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff >= 0 && daysDiff <= 7;
      })
      .sort((a, b) => {
        const aDate = new Date(a.due_at!);
        const bDate = new Date(b.due_at!);
        return aDate.getTime() - bDate.getTime();
      });

    for (const assignment of upcomingDeadlines) {
      const dueDate = new Date(assignment.due_at!);
      const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      activities.push({
        type: 'deadline_soon',
        id: assignment.id,
        title: `Fecha límite próxima: ${assignment.title}`,
        description: daysDiff === 0
          ? 'Vence hoy'
          : daysDiff === 1
            ? 'Vence mañana'
            : `Vence en ${daysDiff} días`,
        timestamp: assignment.due_at!,
        assignment: {
          title: assignment.title,
          dueDate: assignment.due_at!,
        },
        metadata: {
          daysUntilDue: daysDiff,
        },
      });
    }

    // Add overdue assignments
    const overdueAssignments = assignments.items
      .filter(assignment => {
        if (!assignment.due_at) return false;
        const dueDate = new Date(assignment.due_at);
        return dueDate < now;
      })
      .sort((a, b) => {
        const aDate = new Date(a.due_at!);
        const bDate = new Date(b.due_at!);
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, 5);

    for (const assignment of overdueAssignments) {
      const dueDate = new Date(assignment.due_at!);
      const daysPast = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      activities.push({
        type: 'deadline_overdue',
        id: assignment.id,
        title: `Tarea vencida: ${assignment.title}`,
        description: daysPast === 1 ? 'Venció ayer' : `Venció hace ${daysPast} días`,
        timestamp: assignment.due_at!,
        assignment: {
          title: assignment.title,
          dueDate: assignment.due_at!,
        },
        metadata: {
          daysUntilDue: -daysPast,
        },
      });
    }

    // Sort all activities by timestamp (most recent first)
    return activities.sort((a, b) => {
      const aDate = new Date(a.timestamp);
      const bDate = new Date(b.timestamp);
      return bDate.getTime() - aDate.getTime();
    });
  }, [submissions, assignments, students]);

  return {
    activity,
    isLoading: submissionsLoading || assignmentsLoading || studentsLoading,
  };
}