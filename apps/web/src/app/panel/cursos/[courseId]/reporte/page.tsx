"use client";

import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCourseReport, useCourseReportExport } from "@/hooks/use-course-report";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import type { 
  CourseReport, 
  SummaryMetrics, 
  AssignmentAnalysis, 
  StudentSummary,
  Alert 
} from "@/hooks/use-course-report";

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  color = "blue",
  trend 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "red" | "yellow" | "gray";
  trend?: "up" | "down" | "stable";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    green: "bg-green-50 text-green-900 border-green-200",
    red: "bg-red-50 text-red-900 border-red-200",
    yellow: "bg-yellow-50 text-yellow-900 border-yellow-200",
    gray: "bg-gray-50 text-gray-900 border-gray-200",
  };

  const trendIcons = {
    up: "↗️",
    down: "↘️", 
    stable: "→"
  };

  return (
    <div className={`p-6 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-3xl font-bold">{value}</p>
            {trend && <span className="text-lg">{trendIcons[trend]}</span>}
          </div>
          {subtitle && <p className="text-sm opacity-75 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function AlertBadge({ alert }: { alert: Alert }) {
  const severityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-blue-100 text-blue-800 border-blue-200"
  };

  return (
    <div className={`p-3 rounded-lg border ${severityColors[alert.severity as keyof typeof severityColors] || severityColors.medium}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0">
          {alert.severity === 'high' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
          {alert.severity === 'medium' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{alert.message}</p>
          <p className="text-xs opacity-75 mt-1">Tipo: {alert.type}</p>
        </div>
      </div>
    </div>
  );
}

function CourseReportContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  
  const { data: reportData, isLoading, error } = useCourseReport({
    courseId,
    includeAttendance: true,
    includeTemporal: true,
  });

  const { exportToCsv, isExporting } = useCourseReportExport(courseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="Generando reporte completo..." />
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-900 mb-2">Error al generar reporte</h3>
        <p className="text-sm text-red-600 mb-4">
          No pudimos generar el reporte del curso. Verifica los permisos.
        </p>
        <Button onClick={() => router.push(`/panel/cursos/${courseId}`)} variant="ghost">
          Volver al curso
        </Button>
      </div>
    );
  }

  const { report } = reportData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => router.push(`/panel/cursos/${courseId}`)} 
              variant="ghost"
              className="p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <h1 className="text-3xl font-bold text-neutral-900">Reporte del Curso</h1>
          </div>
          <div className="ml-11">
            <h2 className="text-xl text-neutral-700">{report.course_info.name}</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Generado el {new Date(reportData.generated_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={async () => {
              try {
                console.log('Starting course report export for:', courseId);
                const result = await exportToCsv();
                console.log('Export successful:', result);
              } catch (error) {
                console.error('Error exporting:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                alert(`Error al exportar: ${errorMessage}`);
              }
            }}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Exportando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar CSV Completo
              </>
            )}
          </Button>
          
          <div className="text-xs text-neutral-500 text-right">
            <div>{report.summary_metrics.total_students} estudiantes</div>
            <div>{report.summary_metrics.total_assignments} tareas</div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Métricas Generales</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard 
            title="Estudiantes" 
            value={report.summary_metrics.total_students}
            color="blue"
          />
          <MetricCard 
            title="Tasa de Participación" 
            value={`${report.summary_metrics.participation_rate}%`}
            color={report.summary_metrics.participation_rate >= 80 ? "green" : 
                   report.summary_metrics.participation_rate >= 60 ? "yellow" : "red"}
          />
          <MetricCard 
            title="Tasa de Completado" 
            value={`${report.summary_metrics.completion_rate}%`}
            color={report.summary_metrics.completion_rate >= 80 ? "green" : 
                   report.summary_metrics.completion_rate >= 60 ? "yellow" : "red"}
          />
          <MetricCard 
            title="Asistencia Promedio" 
            value={`${report.summary_metrics.attendance_rate}%`}
            color={report.summary_metrics.attendance_rate >= 85 ? "green" : 
                   report.summary_metrics.attendance_rate >= 70 ? "yellow" : "red"}
          />
        </div>
      </div>

      {/* Alerts Section */}
      {report.alerts_and_recommendations.alerts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Alertas y Atención Requerida 
            <span className="ml-2 text-sm bg-red-100 text-red-700 px-2 py-1 rounded-full">
              {report.alerts_and_recommendations.summary.total_alerts}
            </span>
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {report.alerts_and_recommendations.alerts.slice(0, 6).map((alert, index) => (
              <AlertBadge key={index} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Performance */}
        <BarChart
          data={report.assignments_analysis.assignments.map(a => ({
            name: a.title.substring(0, 20) + (a.title.length > 20 ? '...' : ''),
            value: a.submission_rate,
            color: a.submission_rate >= 80 ? "#10b981" : 
                   a.submission_rate >= 60 ? "#f59e0b" : "#ef4444"
          }))}
          title="Tasa de Entrega por Tarea"
          showPercentage={true}
        />

        {/* Student Performance Distribution */}
        <PieChart
          data={[
            { 
              name: "Alto Rendimiento (>80%)", 
              value: report.students_overview.students.filter(s => s.performance_score > 80).length,
              color: "#10b981"
            },
            { 
              name: "Rendimiento Medio (60-80%)", 
              value: report.students_overview.students.filter(s => s.performance_score >= 60 && s.performance_score <= 80).length,
              color: "#f59e0b"
            },
            { 
              name: "Bajo Rendimiento (<60%)", 
              value: report.students_overview.students.filter(s => s.performance_score < 60).length,
              color: "#ef4444"
            },
          ].filter(item => item.value > 0)}
          title="Distribución de Rendimiento Estudiantil"
        />
      </div>

      {/* Top and At-Risk Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Mejores Estudiantes</h3>
          <div className="space-y-3">
            {report.students_overview.top_performers.slice(0, 5).map((student, index) => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{student.name}</p>
                    <p className="text-sm text-neutral-500">{student.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-700">{student.performance_score.toFixed(1)}%</p>
                  <p className="text-xs text-neutral-500">
                    {student.completed_submissions}/{report.summary_metrics.total_assignments} tareas
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* At-Risk Students */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Estudiantes en Riesgo</h3>
          {report.students_overview.at_risk_students.length > 0 ? (
            <div className="space-y-3">
              {report.students_overview.at_risk_students.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-neutral-900">{student.name}</p>
                    <p className="text-sm text-neutral-500">{student.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-700">{student.performance_score.toFixed(1)}%</p>
                    <p className="text-xs text-neutral-500">
                      {student.completed_submissions}/{report.summary_metrics.total_assignments} tareas
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <p>¡Excelente! No hay estudiantes en riesgo.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {report.alerts_and_recommendations.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Recomendaciones</h3>
          <div className="space-y-3">
            {report.alerts_and_recommendations.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700">{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-blue-900">{rec.message}</p>
                  <p className="text-sm text-blue-700 opacity-75">Acción: {rec.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseReportPage() {
  return (
    <RoleGuard allowed={["admin", "coordinator", "teacher"]}>
      <CourseReportContent />
    </RoleGuard>
  );
}
