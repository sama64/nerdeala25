"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCourses } from "@/hooks/use-courses";
import { useCourseReport } from "@/hooks/use-course-report";
import type { Course } from "@/types";
import type { SummaryMetrics, Alert, Recommendation } from "@/hooks/use-course-report";

function MetricCard({
  title,
  value,
  subtitle,
  color = "blue",
  onClick
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "red" | "yellow" | "gray";
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100",
    green: "bg-green-50 text-green-900 border-green-200 hover:bg-green-100",
    red: "bg-red-50 text-red-900 border-red-200 hover:bg-red-100",
    yellow: "bg-yellow-50 text-yellow-900 border-yellow-200 hover:bg-yellow-100",
    gray: "bg-gray-50 text-gray-900 border-gray-200 hover:bg-gray-100",
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-colors ${colorClasses[color]} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function CourseOverviewCard({
  course,
  metrics
}: {
  course: Course;
  metrics?: SummaryMetrics;
}) {
  const router = useRouter();

  const getHealthColor = (rate: number): "green" | "yellow" | "red" => {
    if (rate >= 80) return "green";
    if (rate >= 60) return "yellow";
    return "red";
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900">{course.name}</h3>
            {course.description && (
              <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{course.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
              <span>ID: {course.id}</span>
              {course.created_at && (
                <span>Creado: {new Date(course.created_at).toLocaleDateString('es-ES')}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push(`/panel/cursos/${course.id}`)}
              variant="ghost"
              className="text-xs px-3 py-1 h-auto"
            >
              Ver detalles
            </Button>
            <Button
              onClick={() => router.push(`/panel/cursos/${course.id}/reporte`)}
              variant="primary"
              className="text-xs px-3 py-1 h-auto"
            >
              Reporte completo
            </Button>
          </div>
        </div>

        {metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              title="Estudiantes"
              value={metrics.total_students}
              color="blue"
            />
            <MetricCard
              title="Tareas"
              value={metrics.total_assignments}
              color="gray"
            />
            <MetricCard
              title="Participación"
              value={`${metrics.participation_rate.toFixed(1)}%`}
              color={getHealthColor(metrics.participation_rate)}
            />
            <MetricCard
              title="Finalización"
              value={`${metrics.completion_rate.toFixed(1)}%`}
              color={getHealthColor(metrics.completion_rate)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Spinner label="Cargando métricas..." />
          </div>
        )}
      </div>

      {metrics && (
        <div className="border-t border-neutral-100 px-6 py-3 bg-neutral-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-green-700">
                ✓ {metrics.submitted_count} entregas completadas
              </span>
              <span className="text-yellow-700">
                ⏳ {metrics.draft_count} borradores
              </span>
              {metrics.late_submissions > 0 && (
                <span className="text-red-700">
                  ⚠️ {metrics.late_submissions} tardías
                </span>
              )}
            </div>
            <div className="text-neutral-600">
              Asistencia: {metrics.attendance_rate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsAndRecommendations({
  alerts,
  recommendations
}: {
  alerts: Alert[];
  recommendations: Recommendation[];
}) {
  if (alerts.length === 0 && recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-neutral-900 mb-4">Alertas y Recomendaciones</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        {alerts.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-neutral-900 mb-3">
              Alertas ({alerts.length})
            </h3>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'high'
                      ? 'border-red-500 bg-red-50 text-red-900'
                      : alert.severity === 'medium'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-900'
                      : 'border-blue-500 bg-blue-50 text-blue-900'
                  }`}
                >
                  <p className="text-sm font-medium">{alert.type}</p>
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}
              {alerts.length > 5 && (
                <p className="text-sm text-neutral-500">
                  Y {alerts.length - 5} alerta{alerts.length - 5 !== 1 ? 's' : ''} más...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-neutral-900 mb-3">
              Recomendaciones ({recommendations.length})
            </h3>
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-green-50 border-l-4 border-green-500 text-green-900"
                >
                  <p className="text-sm font-medium">{rec.type}</p>
                  <p className="text-sm">{rec.message}</p>
                  <p className="text-xs mt-1 opacity-75">Acción: {rec.action}</p>
                </div>
              ))}
              {recommendations.length > 5 && (
                <p className="text-sm text-neutral-500">
                  Y {recommendations.length - 5} recomendación{recommendations.length - 5 !== 1 ? 'es' : ''} más...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalMetrics({ courses }: { courses: Course[] }) {
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  // Calculate global metrics
  const totalCourses = courses.length;
  const activeCourses = courses.filter(course =>
    course.created_at && new Date(course.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;

  // Collect all alerts and recommendations from courses
  const allAlerts: Alert[] = [];
  const allRecommendations: Recommendation[] = [];

  // Add global alerts based on metrics
  if (totalCourses > 0) {
    const activityRate = (activeCourses / totalCourses) * 100;
    if (activityRate < 50) {
      allAlerts.push({
        type: "Baja Actividad",
        message: `Solo ${activityRate.toFixed(1)}% de los cursos han tenido actividad en los últimos 30 días`,
        severity: "high"
      });
    }

    if (totalCourses > 10 && activeCourses < 3) {
      allRecommendations.push({
        type: "Gestión de Cursos",
        message: "Considera revisar y archivar cursos inactivos para mejorar la organización",
        action: "Revisar cursos sin actividad reciente"
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Global Overview */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Resumen General</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Cursos"
            value={totalCourses}
            color="blue"
          />
          <MetricCard
            title="Cursos Activos"
            value={activeCourses}
            subtitle="Últimos 30 días"
            color="green"
          />
          <MetricCard
            title="Cursos Inactivos"
            value={totalCourses - activeCourses}
            color="gray"
          />
          <MetricCard
            title="Tasa de Actividad"
            value={totalCourses > 0 ? `${((activeCourses / totalCourses) * 100).toFixed(1)}%` : '0%'}
            color={activeCourses > totalCourses * 0.7 ? "green" : "yellow"}
          />
        </div>
      </div>

      {/* Alerts and Recommendations */}
      <AlertsAndRecommendations
        alerts={allAlerts}
        recommendations={allRecommendations}
      />

      {/* Courses Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900">Cursos Detallados</h2>
          <div className="text-sm text-neutral-500">
            {totalCourses} curso{totalCourses !== 1 ? 's' : ''} total{totalCourses !== 1 ? 'es' : ''}
          </div>
        </div>
        <div className="space-y-4">
          {courses.map((course) => (
            <CourseCardWithMetrics
              key={course.id}
              course={course}
              isExpanded={expandedCourse === course.id}
              onToggleExpand={() => setExpandedCourse(
                expandedCourse === course.id ? null : course.id
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CourseCardWithMetrics({
  course,
  isExpanded,
  onToggleExpand
}: {
  course: Course;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { data: reportData, isLoading } = useCourseReport({
    courseId: course.id,
    includeDetailedStudents: false,
    includeAttendance: true,
    includeTemporal: true,
  });

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <div
        className="p-4 bg-white hover:bg-neutral-50 cursor-pointer transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-900">{course.name}</h3>
            <p className="text-sm text-neutral-600 mt-1">
              ID: {course.id} •
              {course.created_at && ` Creado: ${new Date(course.created_at).toLocaleDateString('es-ES')}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Spinner />}
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-neutral-100">
          {reportData?.report ? (
            <CourseOverviewCard
              course={course}
              metrics={reportData.report.summary_metrics}
            />
          ) : isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <Spinner label="Cargando información del curso..." />
            </div>
          ) : (
            <div className="p-6 bg-neutral-50">
              <p className="text-center text-neutral-500">
                No se pudo cargar la información del curso
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CoordinatorDashboardContent() {
  const { data: coursesData, isLoading, error } = useCourses({ size: 100 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="Cargando cursos..." />
      </div>
    );
  }

  if (error || !coursesData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-900 mb-2">Error al cargar cursos</h3>
        <p className="text-sm text-red-600">
          No pudimos obtener la información de los cursos.
        </p>
      </div>
    );
  }

  const courses = coursesData.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Panel de Coordinación</h1>
          <p className="text-neutral-600 mt-2">
            Vista general y detallada de todos los cursos disponibles
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <div className="space-y-3">
            <div className="mx-auto w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium text-neutral-900">No hay cursos disponibles</h3>
              <p className="text-sm max-w-md mx-auto">
                No se encontraron cursos en el sistema. Los cursos aparecerán aquí una vez que sean creados.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <GlobalMetrics courses={courses} />
      )}
    </div>
  );
}

export default function CoordinatorDashboardPage() {
  return (
    <RoleGuard allowed={["coordinator"]}>
      <CoordinatorDashboardContent />
    </RoleGuard>
  );
}