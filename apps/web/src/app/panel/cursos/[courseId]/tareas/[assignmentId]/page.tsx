"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { apiGet } from "@/lib/api-client";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { useAssignmentExport } from "@/hooks/use-assignment-export";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  max_points: number | null;
  state: string | null;
  course_id: string;
  alternate_link: string | null;
}

interface Statistics {
  total_students: number;
  submitted_count: number;
  draft_count: number;
  not_submitted_count: number;
  late_count: number;
  graded_count: number;
  submission_rate: number;
  on_time_rate: number;
  average_grade: number | null;
  max_grade: number | null;
  min_grade: number | null;
  // New advanced metrics
  approval_rate: number;
  approved_count: number;
  at_risk_count: number;
  avg_days_before_due: number | null;
  percentiles: {
    p25: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
  };
  grade_distribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

interface StudentSubmission {
  student_id: string;
  google_user_id: string;
  full_name: string | null;
  email: string | null;
  submission_status: string;
  turned_in_at: string | null;
  is_late: boolean;
  assigned_grade: number | null;
  draft_grade: number | null;
  state: string | null;
}

interface AssignmentStatsResponse {
  assignment: Assignment;
  statistics: Statistics;
  students: StudentSubmission[];
}

function useAssignmentStats(assignmentId: string) {
  return useQuery({
    queryKey: ['assignment-stats', assignmentId],
    queryFn: () => apiGet<AssignmentStatsResponse>(`/api/v1/assignment-stats/${assignmentId}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!assignmentId,
  });
}

function StatCard({ title, value, subtitle, color = "blue" }: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "red" | "yellow" | "gray";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    green: "bg-green-50 text-green-900 border-green-200",
    red: "bg-red-50 text-red-900 border-red-200",
    yellow: "bg-yellow-50 text-yellow-900 border-yellow-200",
    gray: "bg-gray-50 text-gray-900 border-gray-200",
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="text-center">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function StudentRow({ student }: { student: StudentSubmission }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-green-700 bg-green-50';
      case 'draft': return 'text-yellow-700 bg-yellow-50';
      case 'not_submitted': return 'text-red-700 bg-red-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Entregada';
      case 'draft': return 'Borrador';
      case 'not_submitted': return 'Sin entregar';
      default: return 'Otro';
    }
  };

  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50">
      <td className="py-3 px-4">
        <div>
          <p className="font-medium text-neutral-900">{student.full_name || 'Sin nombre'}</p>
          <p className="text-sm text-neutral-500">{student.email}</p>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.submission_status)}`}>
          {getStatusText(student.submission_status)}
        </span>
        {student.is_late && (
          <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium text-red-700 bg-red-100">
            Tardía
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-neutral-600">
        {student.turned_in_at 
          ? new Date(student.turned_in_at).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '-'
        }
      </td>
      <td className="py-3 px-4 text-sm text-neutral-900">
        {student.assigned_grade !== null ? student.assigned_grade : 
         student.draft_grade !== null ? `${student.draft_grade} (borrador)` : '-'}
      </td>
    </tr>
  );
}

function AssignmentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;
  const courseId = params.courseId as string;
  
  const { data, isLoading, error } = useAssignmentStats(assignmentId);
  const { exportSummary, exportToCsv, isExporting } = useAssignmentExport(assignmentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="Cargando estadísticas..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-900 mb-2">Error al cargar tarea</h3>
        <p className="text-sm text-red-600 mb-4">
          No pudimos obtener las estadísticas de la tarea.
        </p>
        <Button onClick={() => router.push(`/panel/cursos/${courseId}`)} variant="ghost">
          Volver
        </Button>
      </div>
    );
  }

  const { assignment, statistics, students } = data;

  return (
    <div className="space-y-6">
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
            <h1 className="text-2xl font-semibold text-neutral-900">{assignment.title}</h1>
          </div>
          {assignment.description && (
            <p className="text-neutral-600 ml-11">{assignment.description}</p>
          )}
          <div className="ml-11 flex items-center gap-4 text-sm text-neutral-500">
            {assignment.due_at && (
              <span>
                Vencimiento: {new Date(assignment.due_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
            {assignment.max_points && (
              <span>• {assignment.max_points} puntos</span>
            )}
            {assignment.alternate_link && (
              <a 
                href={assignment.alternate_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                • Ver en Classroom
              </a>
            )}
          </div>
        </div>
        
        {/* Export Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={async () => {
              try {
                console.log('Starting export for assignment:', assignmentId);
                const result = await exportToCsv();
                console.log('Export successful:', result);
                // Success feedback could go here
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
                Exportar CSV
              </>
            )}
          </Button>
          
          {exportSummary && (
            <div className="text-xs text-neutral-500 text-right">
              <div>{exportSummary.export_info.total_students} estudiantes</div>
              <div>{exportSummary.export_info.estimated_size}</div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Estudiantes" 
          value={statistics.total_students} 
          color="blue" 
        />
        <StatCard 
          title="Entregaron" 
          value={statistics.submitted_count}
          subtitle={`${statistics.submission_rate.toFixed(1)}%`}
          color="green" 
        />
        <StatCard 
          title="Sin Entregar" 
          value={statistics.not_submitted_count}
          color="red" 
        />
        <StatCard 
          title="Entregas Tardías" 
          value={statistics.late_count}
          color="yellow" 
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          title="Tasa Aprobación" 
          value={`${statistics.approval_rate.toFixed(1)}%`}
          subtitle={`${statistics.approved_count} aprobados`}
          color="green" 
        />
        <StatCard 
          title="En Riesgo" 
          value={statistics.at_risk_count}
          subtitle="< 60% o sin entregar"
          color="red" 
        />
        {statistics.graded_count > 0 && (
          <>
            <StatCard 
              title="Promedio" 
              value={statistics.average_grade?.toFixed(1) || '-'}
              color="blue" 
            />
            <StatCard 
              title="Mediana (P50)" 
              value={statistics.percentiles.p50?.toFixed(1) || '-'}
              color="gray" 
            />
            <StatCard 
              title="Tiempo Promedio" 
              value={statistics.avg_days_before_due ? 
                `${Math.abs(statistics.avg_days_before_due).toFixed(1)} días ${statistics.avg_days_before_due >= 0 ? 'antes' : 'después'}`
                : '-'
              }
              color={statistics.avg_days_before_due && statistics.avg_days_before_due >= 0 ? "green" : "yellow"}
            />
          </>
        )}
      </div>

      {/* Charts Section */}
      {(statistics.graded_count > 0 || statistics.draft_count > 0 || statistics.not_submitted_count > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submission Status Pie Chart - Always show this */}
          <PieChart
            data={[
              { name: "Entregadas", value: statistics.submitted_count, color: "#10b981" },
              { name: "Borradores", value: statistics.draft_count, color: "#f59e0b" },
              { name: "Sin entregar", value: statistics.not_submitted_count, color: "#ef4444" },
            ].filter(item => item.value > 0)}
            title="Estado de Entregas"
          />

          {/* Grade Distribution Chart - Only if there are grades */}
          {statistics.graded_count > 0 ? (
            <BarChart
              data={statistics.grade_distribution.map(item => ({
                name: item.range,
                value: item.count,
                percentage: item.percentage
              }))}
              title="Distribución de Calificaciones"
              showPercentage={true}
            />
          ) : (
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Distribución de Calificaciones</h3>
              <div className="flex items-center justify-center h-48 text-neutral-500">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm">No hay calificaciones aún</p>
                  <p className="text-xs text-neutral-400">Las calificaciones aparecerán aquí una vez que se califiquen las entregas</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Analysis - Only show if there are final submissions */}
      {statistics.submitted_count > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Percentiles Chart */}
          {statistics.graded_count > 0 ? (
            <BarChart
              data={[
                { name: "P25", value: statistics.percentiles.p25 || 0, color: "#ef4444" },
                { name: "P50 (Mediana)", value: statistics.percentiles.p50 || 0, color: "#f59e0b" },
                { name: "P75", value: statistics.percentiles.p75 || 0, color: "#10b981" },
                { name: "P90", value: statistics.percentiles.p90 || 0, color: "#3b82f6" },
              ]}
              title="Percentiles de Rendimiento"
            />
          ) : (
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Percentiles de Rendimiento</h3>
              <div className="flex items-center justify-center h-48 text-neutral-500">
                <p className="text-sm">Disponible cuando haya calificaciones</p>
              </div>
            </div>
          )}

          {/* Time vs Performance Analysis */}
          <PieChart
            data={[
              { name: "A tiempo", value: statistics.submitted_count - statistics.late_count, color: "#10b981" },
              { name: "Tardías", value: statistics.late_count, color: "#ef4444" },
            ].filter(item => item.value > 0)}
            title="Puntualidad de Entregas"
          />
        </div>
      )}

      {/* Student Ranking */}
      {statistics.graded_count > 0 && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Ranking de Rendimiento</h3>
          <div className="space-y-2">
            {students
              .filter(s => s.assigned_grade !== null)
              .sort((a, b) => (b.assigned_grade || 0) - (a.assigned_grade || 0))
              .slice(0, 10)
              .map((student, index) => {
                const grade = student.assigned_grade || 0;
                const maxPoints = assignment.max_points || 10;
                const percentage = (grade / maxPoints) * 100;
                
                let rankColor = "#64748b"; // gray
                if (index === 0) rankColor = "#fbbf24"; // gold
                else if (index === 1) rankColor = "#9ca3af"; // silver  
                else if (index === 2) rankColor = "#cd7c2f"; // bronze
                
                return (
                  <div key={student.student_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: rankColor }}
                    >
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{student.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-neutral-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-neutral-700">
                          {grade.toFixed(1)}/{maxPoints}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-neutral-900">
                        {percentage.toFixed(1)}%
                      </div>
                      {student.is_late && (
                        <span className="text-xs text-red-600">Tardía</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Detalle por Estudiante</h2>
          <p className="text-sm text-neutral-600 mt-1">
            Estado de entrega de cada estudiante inscrito en el curso
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Estudiante</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Fecha de Entrega</th>
                <th className="text-left py-3 px-4 font-medium text-neutral-700">Calificación</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <StudentRow key={student.student_id} student={student} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AssignmentDetailPage() {
  return (
    <RoleGuard allowed={["admin", "coordinator", "teacher", "student"]}>
      <AssignmentDetailContent />
    </RoleGuard>
  );
}
