"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCourseDetail } from "@/hooks/use-course-detail";
import { useCourseStudents } from "@/hooks/use-course-students";
import { useCourseAssignments } from "@/hooks/use-course-assignments";
import { useCourseActivity } from "@/hooks/use-course-activity";
import { ActivityCard } from "@/components/ActivityCard";
import { useAuth } from "@/components/auth-provider";
import type { CourseParticipant } from "@/hooks/use-course-students";
import type { CourseAssignment } from "@/hooks/use-course-assignments";

const ACCENT_GRADIENTS = [
  "from-sky-500/90 to-blue-500/90",
  "from-indigo-500/90 to-violet-500/90",
  "from-emerald-500/90 to-teal-500/90",
  "from-amber-500/90 to-orange-500/90",
  "from-rose-500/90 to-pink-500/90",
  "from-cyan-500/90 to-sky-500/90",
];

const getAccentGradient = (id: string) => {
  if (!id) return ACCENT_GRADIENTS[0];
  const index = [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0) % ACCENT_GRADIENTS.length;
  return ACCENT_GRADIENTS[index];
};

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelative = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `Hace ${diffWeeks} semana${diffWeeks === 1 ? "" : "s"}`;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatCourseId = (id: string) => {
  if (id.length <= 12) return id;
  return `${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(-4)}`;
};

const getInitials = (name: string) => {
  if (!name) return "Curso";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((word) => word[0]).join(" ").toUpperCase();
};

function StudentCard({ student }: { student: CourseParticipant }) {
  const initials = getInitials(student.full_name || student.email || "Estudiante");
  const lastSeenLabel = formatRelative(student.last_seen_at);
  const isLinked = Boolean(student.matched_user_id);

  return (
    <article className="group flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm transition-all hover:-translate-y-[2px] hover:border-primary/30 hover:shadow-lg">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">
          {initials}
          <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full shadow-sm ${isLinked ? 'bg-success' : 'bg-amber-400'}`} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-neutral-900">{student.full_name || "Sin nombre"}</h4>
          <p className="text-xs text-neutral-500">{student.email || "Sin email registrado"}</p>
          {lastSeenLabel && (
            <p className="text-xs text-neutral-400">Última actividad: {lastSeenLabel}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 text-right text-xs">
        <Badge variant={isLinked ? "success" : "warning"}>
          {isLinked ? "Vinculado" : "Sin vincular"}
        </Badge>
        <p className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">
          Rol: {student.role === "student" ? "Estudiante" : student.role}
        </p>
      </div>
    </article>
  );
}

function AssignmentCard({ assignment, courseId }: { assignment: CourseAssignment; courseId: string }) {
  const router = useRouter();
  const isOverdue = assignment.due_at && new Date(assignment.due_at) < new Date();
  const dueSoon = assignment.due_at && new Date(assignment.due_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dueLabel = formatDateTime(assignment.due_at);
  const relativeDue = formatRelative(assignment.due_at);

  const stateVariant = assignment.state === "PUBLISHED" ? "success" : assignment.state === "DRAFT" ? "warning" : "info";
  const dueBadgeVariant = isOverdue ? "danger" : dueSoon ? "warning" : "info";

  return (
    <article className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-[2px] hover:border-primary/30 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold text-neutral-900">{assignment.title}</h4>
            {assignment.state && (
              <Badge variant={stateVariant}>{assignment.state}</Badge>
            )}
          </div>
          {assignment.description && (
            <p className="text-sm text-neutral-600 line-clamp-3">{assignment.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            {assignment.work_type && (
              <Badge variant="info" className="bg-primary/10 text-primary">
                {assignment.work_type}
              </Badge>
            )}
            {assignment.max_points && (
              <span className="rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-700">
                {assignment.max_points} pts
              </span>
            )}
            {assignment.due_at && (
              <Badge variant={dueBadgeVariant} className="flex items-center gap-1">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8v4l2.5 2.5" />
                  <path d="M21 12a9 9 0 11-9-9 9 9 0 019 9z" />
                </svg>
                {isOverdue ? "Vencida" : dueSoon ? "Próxima" : "Programada"}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {assignment.alternate_link && (
            <a
              href={assignment.alternate_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/15"
            >
              Classroom
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </a>
          )}
          <Button
            variant="ghost"
            className="text-xs text-primary hover:bg-primary/5"
            onClick={() => router.push(`/panel/cursos/${courseId}/tareas/${assignment.id}`)}
          >
            Ver estadísticas
          </Button>
          {assignment.due_at && dueLabel && (
            <div className="rounded-xl bg-neutral-50 px-3 py-2 text-right text-xs text-neutral-500">
              <p className="font-semibold text-neutral-700">{isOverdue ? "Vencida" : "Entrega"}</p>
              <p>{dueLabel}</p>
              {relativeDue && <p className="text-[11px] text-neutral-400">({relativeDue})</p>}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CourseDetailContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const { user } = useAuth();

  const { data: course, isLoading, error } = useCourseDetail(courseId);
  const { data: studentsData, isLoading: studentsLoading } = useCourseStudents({ courseId });
  const { data: assignmentsData, isLoading: assignmentsLoading } = useCourseAssignments({ courseId });
  const { activity, isLoading: activityLoading } = useCourseActivity({ courseId });

  const assignmentItems = assignmentsData?.items ?? [];
  const upcomingAssignments = useMemo(() => {
    const now = Date.now();
    const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
    return assignmentItems.filter((item) => {
      if (!item.due_at) return false;
      const due = new Date(item.due_at).getTime();
      return due >= now && due <= weekAhead;
    }).length;
  }, [assignmentItems]);

  const overdueAssignments = useMemo(() => {
    const now = Date.now();
    return assignmentItems.filter((item) => {
      if (!item.due_at) return false;
      return new Date(item.due_at).getTime() < now;
    }).length;
  }, [assignmentItems]);

  const totalStudents = studentsData?.pagination.total ?? 0;
  const totalAssignments = assignmentsData?.pagination.total ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="Cargando curso..." />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-900 mb-2">Error al cargar curso</h3>
        <p className="text-sm text-red-600 mb-4">
          No pudimos obtener la información del curso. Verifica que el curso existe y tienes permisos.
        </p>
        <Button onClick={() => router.back()} variant="ghost">
          Volver
        </Button>
      </div>
    );
  }

  const gradient = getAccentGradient(course.id);
  const initials = getInitials(course.name);
  const createdLabel = formatDateTime(course.created_at) ?? "No disponible";
  const updatedLabel = formatDateTime(course.updated_at) ?? "No disponible";
  const updatedRelative = formatRelative(course.updated_at ?? course.created_at);

  return (
    <div className="space-y-8">
      <section className={`overflow-hidden rounded-3xl bg-gradient-to-r ${gradient} text-white shadow-xl`}>
        <div className="relative px-6 py-8 sm:px-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/70">
              <Button
                onClick={() => router.push('/panel/cursos')}
                variant="ghost"
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </Button>
              Curso sincronizado
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-start gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold uppercase tracking-wide text-white">
                  {initials.replace(/\s+/g, "")}
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h1 className="text-3xl font-semibold tracking-tight">{course.name}</h1>
                    {course.description ? (
                      <p className="max-w-2xl text-sm text-white/80">{course.description}</p>
                    ) : (
                      <p className="text-sm text-white/70">Este curso aún no tiene descripción desde Classroom.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                    <Badge className="border border-white/30 bg-white/15 text-white" variant="success">
                      Integración activa
                    </Badge>
                    <span>Última sincronización: {updatedRelative || "Sin registro"}</span>
                    {user?.name && <span>Estás en sesión como {user.name}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => router.push(`/panel/cursos/${courseId}/reporte`)}
                  variant="secondary"
                  className="bg-white/15 text-white hover:bg-white/20"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Reporte completo
                </Button>
                <Button
                  onClick={() => router.push(`/panel/cursos/${courseId}/asistencia`)}
                  variant="primary"
                  className="bg-white text-primary hover:bg-white/90"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Tomar asistencia
                </Button>
              </div>
            </div>

            <dl className="grid gap-4 border-t border-white/10 pt-6 text-sm text-white/80 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-white/60">ID del curso</dt>
                <dd className="font-mono text-base font-semibold text-white">{formatCourseId(course.id)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-white/60">Creado</dt>
                <dd>{createdLabel}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-white/60">Actualizado</dt>
                <dd>{updatedLabel}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estudiantes</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{totalStudents}</p>
          <p className="text-xs text-neutral-500">Inscritos desde Google Classroom</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tareas</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{totalAssignments}</p>
          <p className="text-xs text-neutral-500">Publicadas en el curso</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Próximas entregas</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{upcomingAssignments}</p>
          <p className="text-xs text-neutral-500">En los próximos 7 días</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tareas vencidas</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{overdueAssignments}</p>
          <p className="text-xs text-neutral-500">Revisar y enviar recordatorios</p>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Detalles del curso</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Información clave para referencias rápidas y soporte.
        </p>
        <dl className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Identificador completo</dt>
            <dd className="font-mono text-sm text-neutral-900">{course.id}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Profesor/a (ID Classroom)</dt>
            <dd className="font-mono text-sm text-neutral-900">{course.teacher_id || 'No asignado'}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Creado en</dt>
            <dd className="text-sm text-neutral-900">{createdLabel}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Última sincronización</dt>
            <dd className="text-sm text-neutral-900">{updatedLabel}</dd>
          </div>
        </dl>
      </section>

      {/* Placeholder sections for future features */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Students Section */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Estudiantes</h2>
            <span className="text-sm text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
              {studentsData?.pagination.total || 0} estudiantes
            </span>
          </div>
          
          {studentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner label="Cargando estudiantes..." />
            </div>
          ) : studentsData?.items && studentsData.items.length > 0 ? (
            <div className="space-y-3">
              {studentsData.items.slice(0, 5).map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}
              {studentsData.items.length > 5 && (
                <div className="pt-3 border-t border-neutral-100">
                  <Button variant="ghost" className="w-full text-sm">
                    Ver todos los {studentsData.pagination.total} estudiantes
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-sm">No hay estudiantes inscritos en este curso</p>
              </div>
            </div>
          )}
        </div>

        {/* Assignments Section */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Tareas</h2>
            <span className="text-sm text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
              {assignmentsData?.pagination.total || 0} tareas
            </span>
          </div>
          
          {assignmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner label="Cargando tareas..." />
            </div>
          ) : assignmentsData?.items && assignmentsData.items.length > 0 ? (
            <div className="space-y-3">
              {assignmentsData.items.slice(0, 5).map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} courseId={courseId} />
              ))}
              {assignmentsData.items.length > 5 && (
                <div className="pt-3 border-t border-neutral-100">
                  <Button variant="ghost" className="w-full text-sm">
                    Ver todas las {assignmentsData.pagination.total} tareas
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm">No hay tareas creadas en este curso</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Section */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Actividad reciente</h2>
          <span className="text-sm text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
            {activity.length} eventos
          </span>
        </div>

        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner label="Cargando actividad..." />
          </div>
        ) : activity.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activity.slice(0, 10).map((item) => (
              <ActivityCard key={`${item.type}-${item.id}`} activity={item} />
            ))}
            {activity.length > 10 && (
              <div className="pt-3 border-t border-neutral-100">
                <Button variant="ghost" className="w-full text-sm">
                  Ver toda la actividad ({activity.length} eventos)
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            <div className="space-y-3">
              <div className="mx-auto w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-medium text-neutral-900">Sin actividad reciente</h3>
                <p className="text-sm max-w-md mx-auto">
                  No hay entregas recientes ni fechas límite próximas en este curso
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <RoleGuard allowed={["admin", "coordinator", "teacher", "student"]}>
      <CourseDetailContent />
    </RoleGuard>
  );
}
