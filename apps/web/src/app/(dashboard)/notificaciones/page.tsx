"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  createNotification,
  deleteNotification,
  fetchNotifications,
  fetchStudentOverview,
  sendTestWhatsAppMessage,
  updateNotificationStatus
} from "@/features/dashboard/api";
import type { NotificationItem, StudentOverview } from "@/types";

type StudentOverviewList = Awaited<ReturnType<typeof fetchStudentOverview>>;
type NotificationsList = Awaited<ReturnType<typeof fetchNotifications>>;

export default function NotificacionesPage() {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const studentsQuery = useQuery<StudentOverviewList>({
    queryKey: ["students", "for-notifications"],
    queryFn: () => fetchStudentOverview()
  });
  const notificationsQuery = useQuery<NotificationsList>({
    queryKey: ["notifications", studentId],
    queryFn: () => fetchNotifications(studentId || undefined)
  });

  const createMutation = useMutation<NotificationItem>({
    mutationFn: () => createNotification({ student_id: studentId, message }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const updateMutation = useMutation<NotificationItem, unknown, { id: string; status: "read" | "sent" | "pending" }>({
    mutationFn: (payload: { id: string; status: "read" | "sent" | "pending" }) =>
      updateNotificationStatus(payload.id, payload.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const deleteMutation = useMutation<void, unknown, string>({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const testMutation = useMutation<{ status: string }, unknown, void>({
    mutationFn: async () => {
      const text = message.trim() || "Mensaje de prueba desde el panel";
      return sendTestWhatsAppMessage({ phone: testPhone, text });
    },
    onMutate: () => {
      setTestFeedback(null);
    },
    onSuccess: () => {
      setTestFeedback("Mensaje de WhatsApp enviado correctamente");
    },
    onError: () => {
      setTestFeedback("No se pudo enviar el mensaje de prueba. Intenta nuevamente.");
    }
  });

  const filteredStudents = studentsQuery.data?.items.filter((student) =>
    student.user.name.toLowerCase().includes(search.toLowerCase())
  );

  const canSend = Boolean(studentId && message.trim().length > 4);
  const canTest = Boolean(testPhone.trim().length >= 6);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Centro de notificaciones</h1>
          <p className="text-sm text-neutral-600">Envía alertas en minutos y da seguimiento a su estado.</p>
        </div>
        <Input
          className="w-64"
          placeholder="Buscar estudiante"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Nueva notificación" subtitle="Selecciona destinatario y redacta el mensaje" />
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSend) return;
              createMutation.mutate();
            }}
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estudiante</label>
              <Select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="mt-1">
                <option value="">Selecciona estudiante</option>
                {filteredStudents?.map((student: StudentOverview) => (
                  <option key={student.id} value={student.id}>
                    {student.user.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Mensaje</label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                placeholder="Describe la tarea, alerta o recordatorio"
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={!canSend || createMutation.isPending}>
              {createMutation.isPending ? "Enviando..." : "Enviar notificación"}
            </Button>
            <div className="rounded-lg border border-dashed border-neutral-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-800">Prueba rápida por WhatsApp</p>
                  <p className="text-xs text-neutral-500">
                    Envía este mensaje a tu número para verificar la integración.
                  </p>
                </div>
                {testFeedback && (
                  <span className={`text-xs ${testFeedback.includes("No") ? "text-red-500" : "text-success"}`}>
                    {testFeedback}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  className="sm:max-w-xs"
                  placeholder="Ej. +5491122334455"
                  value={testPhone}
                  onChange={(event) => setTestPhone(event.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canTest || testMutation.isPending}
                  onClick={() => testMutation.mutate()}
                >
                  {testMutation.isPending ? "Enviando prueba..." : "Probar en WhatsApp"}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Historial" subtitle="Filtra por estudiante para enfocar las alertas" />
          {notificationsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner label="Cargando notificaciones" />
            </div>
          ) : notificationsQuery.data?.length ? (
            <ul className="space-y-3">
              {notificationsQuery.data.map((notification: NotificationItem) => (
                <li key={notification.id} className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-neutral-800">{notification.message}</p>
                      <p className="text-xs text-neutral-500">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                    <select
                      value={notification.status}
                      onChange={(event) =>
                        updateMutation.mutate({ id: notification.id, status: event.target.value as "read" | "sent" | "pending" })
                      }
                      className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="sent">Enviada</option>
                      <option value="read">Leída</option>
                    </select>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      className="text-red-500 hover:underline"
                      onClick={() => deleteMutation.mutate(notification.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">Selecciona un estudiante o envía tu primera notificación.</p>
          )}
        </Card>
      </div>
    </section>
  );
}
