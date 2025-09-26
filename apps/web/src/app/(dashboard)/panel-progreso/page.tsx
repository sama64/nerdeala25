"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fetchCourses, fetchStudentOverview } from "@/features/dashboard/api";
import type { Course, StudentOverview } from "@/types";

type CoursesList = Awaited<ReturnType<typeof fetchCourses>>;
type StudentOverviewList = Awaited<ReturnType<typeof fetchStudentOverview>>;

export default function PanelProgresoPage() {
  const [courseId, setCourseId] = useState<string | undefined>();

  const coursesQuery = useQuery<CoursesList>({
    queryKey: ["courses"],
    queryFn: fetchCourses
  });

  const studentsQuery = useQuery<StudentOverviewList>({
    queryKey: ["students", courseId],
    queryFn: () => fetchStudentOverview({ courseId }),
    placeholderData: (previousData) => previousData
  });

  const metrics = studentsQuery.data?.metrics ?? { average_progress: 0, average_attendance: 0 };

  const topStudents = useMemo(() => {
    if (!studentsQuery.data?.items) return [];
    return [...studentsQuery.data.items].sort((a, b) => b.progress - a.progress).slice(0, 5);
  }, [studentsQuery.data?.items]);

  const handleCourseChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setCourseId(value ? value : undefined);
  };

  const renderHeader = () => (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Panel de progreso</h1>
        <p className="text-sm text-neutral-600">
          Analiza el rendimiento estudiantil y los indicadores principales en tiempo real.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Select className="w-56" value={courseId ?? ""} onChange={handleCourseChange}>
          <option value="">Todos los cursos</option>
          {coursesQuery.data?.map((course: Course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={() => studentsQuery.refetch()}>
          Actualizar datos
        </Button>
      </div>
    </div>
  );

  return (
    <section className="space-y-6">
      {renderHeader()}
      {studentsQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Cargando métricas" />
        </div>
      ) : studentsQuery.isError ? (
        <Card>
          <p className="text-sm text-red-600">No se pudieron cargar los datos. Intenta nuevamente.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Promedio de progreso" value={`${Math.round((metrics.average_progress ?? 0) * 100)}%`} trend=" +5%" trendLabel="vs. mes anterior" />
            <MetricCard title="Asistencia promedio" value={`${Math.round((metrics.average_attendance ?? 0) * 100)}%`} trend=" +3%" trendLabel="vs. mes anterior" />
            <MetricCard title="Estudiantes monitoreados" value={String(studentsQuery.data?.pagination.total ?? 0)} trend=" 12" trendLabel="nuevos inscritos" />
            <MetricCard title="Alertas activas" value={String(studentsQuery.data?.items.reduce((sum, item) => sum + item.alerts, 0) ?? 0)} trend=" -8" trendLabel="alertas resueltas" />
          </div>

          <Card>
            <CardHeader title="Top estudiantes" subtitle="Ordenados por avance acumulado" />
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Estudiante</th>
                    <th className="px-4 py-3">Curso</th>
                    <th className="px-4 py-3">Progreso</th>
                    <th className="px-4 py-3">Asistencia</th>
                    <th className="px-4 py-3">Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-sm text-neutral-700">
                  {topStudents.map((student: StudentOverview) => (
                    <tr key={student.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900">{student.user.name}</td>
                      <td className="px-4 py-3">{student.course_id ?? "Sin asignar"}</td>
                      <td className="px-4 py-3">{Math.round(student.progress * 100)}%</td>
                      <td className="px-4 py-3">{Math.round(student.attendance_rate * 100)}%</td>
                      <td className="px-4 py-3">{student.alerts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {topStudents.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-neutral-500">No hay estudiantes registrados aún.</p>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Resumen completo" subtitle="Listado completo de estudiantes con métricas clave" />
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3">Progreso</th>
                    <th className="px-4 py-3">Asistencia</th>
                    <th className="px-4 py-3">Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-sm">
                  {studentsQuery.data?.items.map((student) => (
                    <tr key={student.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900">{student.user.name}</td>
                      <td className="px-4 py-3 text-neutral-600">{student.user.email}</td>
                      <td className="px-4 py-3">{Math.round(student.progress * 100)}%</td>
                      <td className="px-4 py-3">{Math.round(student.attendance_rate * 100)}%</td>
                      <td className="px-4 py-3">{student.alerts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}

function MetricCard({ title, value, trend, trendLabel }: { title: string; value: string; trend: string; trendLabel: string }) {
  return (
    <Card className="space-y-3">
      <p className="text-sm font-medium text-neutral-500">{title}</p>
      <div className="text-3xl font-semibold text-neutral-900">{value}</div>
      <p className="text-xs text-success">{trend} <span className="text-neutral-500">{trendLabel}</span></p>
    </Card>
  );
}
