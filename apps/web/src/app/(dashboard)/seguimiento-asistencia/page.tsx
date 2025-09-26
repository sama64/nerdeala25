"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fetchAttendance, fetchStudentOverview } from "@/features/dashboard/api";
import type { AttendanceRecord, StudentOverview } from "@/types";

type StudentOverviewList = Awaited<ReturnType<typeof fetchStudentOverview>>;
type AttendanceResponse = Awaited<ReturnType<typeof fetchAttendance>>;

export default function SeguimientoAsistenciaPage() {
  const [studentId, setStudentId] = useState<string>("");
  const [date, setDate] = useState<string>("");

  const studentsQuery = useQuery<StudentOverviewList>({ queryKey: ["students", "attendance"], queryFn: () => fetchStudentOverview() });
  const attendanceQuery = useQuery<AttendanceResponse>({
    queryKey: ["attendance", studentId, date],
    queryFn: () => fetchAttendance({ studentId: studentId || undefined, date: date || undefined })
  });

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Seguimiento de asistencia</h1>
          <p className="text-sm text-neutral-600">Filtra por estudiante o fecha y toma acciones al instante.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select className="w-56" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">Todos los estudiantes</option>
            {studentsQuery.data?.items.map((student: StudentOverview) => (
              <option key={student.id} value={student.id}>
                {student.user.name}
              </option>
            ))}
          </Select>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </header>

      {attendanceQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Cargando asistencia" />
        </div>
      ) : attendanceQuery.isError ? (
        <Card>
          <p className="text-sm text-red-600">No se logró obtener el registro de asistencia.</p>
        </Card>
      ) : !attendanceQuery.data ? (
        <Card>
          <p className="text-sm text-neutral-500">Sin información disponible.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(attendanceQuery.data.summary).map(([key, value]) => (
              <SummaryCard key={key} label={traducirEstado(key)} value={value} />
            ))}
          </div>

          <Card>
            <CardHeader title="Historial" subtitle="Registros ordenados por fecha" />
            {attendanceQuery.data.items.length === 0 ? (
              <p className="text-sm text-neutral-500">No hay registros según los filtros aplicados.</p>
            ) : (
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Estudiante</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {attendanceQuery.data.items.map((item: AttendanceRecord) => {
                    const student = studentsQuery.data?.items.find((s) => s.id === item.student_id);
                    return (
                      <tr key={item.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3">{format(new Date(item.date), "d MMM yyyy", { locale: es })}</td>
                        <td className="px-4 py-3">{student?.user.name ?? "-"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={item.status === "present" ? "success" : item.status === "late" ? "warning" : "danger"}>
                            {traducirEstado(item.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{item.notes ?? "Sin notas"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-900">{value}</p>
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
