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
import type { StudentDetailResponse, StudentOverview } from "@/types";

type StudentOverviewList = Awaited<ReturnType<typeof fetchStudentOverview>>;

export default function EstadoEntregasPage() {
  const [studentId, setStudentId] = useState<string>("");

  const studentsQuery = useQuery<StudentOverviewList>({
    queryKey: ["students", "deliveries"],
    queryFn: () => fetchStudentOverview()
  });
  const detailQuery = useQuery<StudentDetailResponse>({
    queryKey: ["deliveries", studentId],
    queryFn: () => fetchStudentDetail(studentId),
    enabled: Boolean(studentId)
  });

  const summary = detailQuery.data?.notifications_summary ?? { pending: 0, sent: 0, read: 0 };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Estado de entregas</h1>
          <p className="text-sm text-neutral-600">Visualiza entregas por estudiante y controla trabajos pendientes.</p>
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
          <p className="text-sm text-neutral-600">Elige un estudiante para revisar las entregas recientes.</p>
        </Card>
      ) : detailQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Sincronizando entregas" />
        </div>
      ) : detailQuery.isError || !detailQuery.data ? (
        <Card>
          <p className="text-sm text-red-600">No fue posible recuperar las entregas.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryStat label="Pendientes" value={summary.pending} variant="danger" description="Trabajos sin enviar" />
            <SummaryStat label="Enviadas tarde" value={summary.sent} variant="warning" description="Verifica correcciones" />
            <SummaryStat label="Confirmadas" value={summary.read} variant="success" description="Entregas registradas" />
          </div>

          <Card>
            <CardHeader title="Entregas registradas" subtitle="Resumen de reportes asociados al estudiante" />
            {detailQuery.data.student.reports.length === 0 ? (
              <p className="text-sm text-neutral-500">Todavía no hay entregas cargadas desde Classroom.</p>
            ) : (
              <ul className="space-y-3">
                {detailQuery.data.student.reports.map((report) => (
                  <li key={report.id} className="rounded-lg border border-neutral-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-neutral-800">Entrega registrada</p>
                        <p className="text-xs text-neutral-500">
                          {format(new Date(report.generated_at), "d MMM yyyy, HH:mm", { locale: es })}
                        </p>
                      </div>
                      <Badge variant="success">Confirmada</Badge>
                    </div>
                    <p className="mt-2 text-sm text-neutral-600">{report.data}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}

function SummaryStat({
  label,
  value,
  variant,
  description
}: {
  label: string;
  value: number;
  description: string;
  variant: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-600">{label}</p>
        <Badge variant={variant}>{value}</Badge>
      </div>
      <p className="mt-2 text-xs text-neutral-500">{description}</p>
    </div>
  );
}
