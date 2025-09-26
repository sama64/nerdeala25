"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fetchStudentDetail, fetchStudentOverview } from "@/features/dashboard/api";
import type { NotificationItem, StudentDetailResponse, StudentOverview } from "@/types";

type StudentOverviewList = Awaited<ReturnType<typeof fetchStudentOverview>>;

export default function DetallesEstudiantePage() {
  const [studentId, setStudentId] = useState<string>("");

  const studentsQuery = useQuery<StudentOverviewList>({
    queryKey: ["students", "selector"],
    queryFn: () => fetchStudentOverview()
  });

  const detailQuery = useQuery<StudentDetailResponse>({
    queryKey: ["student-detail", studentId],
    queryFn: () => fetchStudentDetail(studentId),
    enabled: Boolean(studentId)
  });

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Detalles del estudiante</h1>
          <p className="text-sm text-neutral-600">Selecciona un perfil para revisar métricas, notificaciones y asistencia.</p>
        </div>
        <Select className="w-64" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          <option value="">Selecciona estudiante</option>
          {studentsQuery.data?.items.map((student: StudentOverview) => (
            <option key={student.id} value={student.id}>
              {student.user.name}
            </option>
          ))}
        </Select>
      </header>

      {!studentId ? (
        <Card>
          <p className="text-sm text-neutral-600">Selecciona un estudiante para ver su información detallada.</p>
        </Card>
      ) : detailQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Cargando información del estudiante" />
        </div>
      ) : detailQuery.isError || !detailQuery.data ? (
        <Card>
          <p className="text-sm text-red-600">No se pudo cargar la información del estudiante.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader title={detailQuery.data.student.user.name} subtitle={detailQuery.data.student.user.email} />
            <div className="grid gap-4 md:grid-cols-3">
              <InfoStat label="Progreso" value={`${Math.round(detailQuery.data.student.progress * 100)}%`} />
              <InfoStat label="Asistencia" value={`${Math.round(detailQuery.data.student.attendance_rate * 100)}%`} />
              <InfoStat label="Alertas" value={String(detailQuery.data.student.alerts)} />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Notificaciones" subtitle="Historial reciente" />
              <div className="space-y-3">
                {detailQuery.data.student.notifications.length === 0 ? (
                  <p className="text-sm text-neutral-500">No hay notificaciones registradas.</p>
                ) : (
                  detailQuery.data.student.notifications.map((notification: NotificationItem) => (
                    <div key={notification.id} className="flex items-start justify-between rounded-lg border border-neutral-200 p-3">
                      <div>
                        <p className="text-sm text-neutral-800">{notification.message}</p>
                        <p className="text-xs text-neutral-500">
                          {format(new Date(notification.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                        </p>
                      </div>
                      <Badge variant={notification.status === "pending" ? "warning" : notification.status === "read" ? "info" : "success"}>
                        {notification.status === "pending" ? "Pendiente" : notification.status === "read" ? "Leída" : "Enviada"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Asistencia" subtitle="Conteo por estado" />
              <ul className="space-y-2 text-sm text-neutral-700">
                {Object.entries(detailQuery.data.attendance_summary).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
                    <span className="capitalize">{traducirEstado(key)}</span>
                    <span className="font-semibold">{value}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <CardHeader title="Reportes y hallazgos" subtitle="Documentos generados para acompañamiento individual" />
            <div className="space-y-3">
              {detailQuery.data.student.reports.length === 0 ? (
                <p className="text-sm text-neutral-500">El docente todavía no registra reportes para este estudiante.</p>
              ) : (
                detailQuery.data.student.reports.map((report) => (
                  <article key={report.id} className="rounded-lg border border-neutral-200 p-4">
                    <h3 className="text-sm font-semibold text-neutral-800">Reporte {format(new Date(report.generated_at), "d MMM yyyy", { locale: es })}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{report.data}</p>
                  </article>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function traducirEstado(state: string) {
  switch (state) {
    case "present":
      return "Presente";
    case "absent":
      return "Ausente";
    case "late":
      return "Tarde";
    default:
      return state;
  }
}
