"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/auth/role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { useCourses } from "@/hooks/use-courses";
import { useAuth } from "@/components/auth-provider";
import { syncClassroomCourses } from "@/features/dashboard/api";
import { sendTestWhatsAppMessage } from "@/features/dashboard/api";
import { DemoFeatureShowcase } from "@/components/demo-feature-showcase";
import type { Course } from "@/types";

const ACCENT_GRADIENTS = [
  "from-sky-500 to-blue-500",
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-sky-500",
];

const getAccentGradient = (id: string) => {
  if (!id) {
    return ACCENT_GRADIENTS[0];
  }

  const index = [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0) % ACCENT_GRADIENTS.length;
  return ACCENT_GRADIENTS[index];
};

const getInitials = (name: string) => {
  if (!name) return "Curso";
  const words = name.trim().split(/\s+/);
  const initials = words.slice(0, 2).map((word) => word[0]).join("");
  return initials.toUpperCase();
};

const formatCourseId = (id: string) => {
  if (id.length <= 10) return id;
  return `${id.slice(0, 4)}-${id.slice(4, 8)}-${id.slice(-4)}`;
};

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatRelativeDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 7) return `Hace ${diffDays} días`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `Hace ${diffWeeks} semana${diffWeeks === 1 ? "" : "s"}`;
  }

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

function CourseCard({ course }: { course: Course }) {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/panel/cursos/${course.id}`);
  };

  const gradient = getAccentGradient(course.id);
  const initials = getInitials(course.name);
  const createdLabel = formatDate(course.created_at);
  const updatedLabel = formatRelativeDate(course.updated_at ?? course.created_at);
  const recentThreshold = 1000 * 60 * 60 * 24 * 7; // 7 días
  const isRecent = course.created_at
    ? Date.now() - new Date(course.created_at).getTime() <= recentThreshold
    : false;

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl cursor-pointer"
      onClick={handleViewDetails}
    >
      <div className={`bg-gradient-to-r ${gradient} px-6 py-4 text-white`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-lg font-semibold uppercase tracking-wide">
              {initials}
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-white/70">Curso sincronizado</p>
              <h3 className="text-lg font-semibold leading-tight">{course.name}</h3>
            </div>
          </div>

          {isRecent && (
            <Badge
              variant="success"
              className="border border-white/30 bg-white/15 text-white backdrop-blur-sm"
            >
              Nuevo
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-6 py-5">
        <p className="text-sm leading-relaxed text-neutral-600 line-clamp-3">
          {course.description?.trim() ||
            "Este curso todavía no tiene descripción. Puedes agregar una desde Google Classroom."}
        </p>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-neutral-500">ID del curso</dt>
            <dd className="font-medium text-neutral-900">{formatCourseId(course.id)}</dd>
          </div>

          <div>
            <dt className="text-neutral-500">Sincronización</dt>
            <dd className="flex items-center gap-2 font-medium text-neutral-900">
              Google Classroom
              <span className="h-2 w-2 rounded-full bg-success"></span>
            </dd>
          </div>

          {createdLabel && (
            <div>
              <dt className="text-neutral-500">Creado</dt>
              <dd className="font-medium text-neutral-900">{createdLabel}</dd>
            </div>
          )}

          {updatedLabel && (
            <div>
              <dt className="text-neutral-500">Actualizado</dt>
              <dd className="font-medium text-neutral-900">{updatedLabel}</dd>
            </div>
          )}
        </dl>

        <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-4 text-sm">
          <span className="text-neutral-500">
            Revisa tareas, estudiantes y métricas en el panel del curso.
          </span>
          <Button
            variant="ghost"
            className="text-primary hover:bg-primary/5"
            onClick={(event) => {
              event.stopPropagation();
              handleViewDetails();
            }}
          >
            Ver detalles
            <svg
              className="ml-2 h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14"></path>
              <path d="M13 6l6 6-6 6"></path>
            </svg>
          </Button>
        </div>
      </div>
    </article>
  );
}

function CoursesContent() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [whatsAppStatus, setWhatsAppStatus] = useState<string | null>(null);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const { googleAccessToken, onboardingState, user } = useAuth();
  const { isDemoMode, demoRole } = useDemoMode();

  const { data, isLoading, error, refetch } = useCourses();

  // Debug info for demo mode
  console.log('Cursos page render:', { 
    isDemoMode, 
    demoRole,
    userRole: user?.role, 
    dataItems: data?.items?.length,
    isLoading,
    error 
  });

  const phoneNumber = onboardingState?.phone_e164;
  const canTestWhatsApp = Boolean(phoneNumber && phoneNumber.trim().length >= 6);

  const handleSync = async () => {
    if (!googleAccessToken) {
      setSyncMessage("No se encontró token de Google. Vuelve a iniciar sesión.");
      return;
    }

    setIsSyncing(true);
    setSyncMessage("Sincronizando cursos desde Google Classroom...");

    try {
      const response = await syncClassroomCourses(googleAccessToken);
      const count = response.count || 0;
      setSyncMessage(
        count > 0
          ? `✅ Sincronización exitosa. Se procesaron ${count} curso${count === 1 ? '' : 's'}.`
          : "✅ Sincronización completada. No se encontraron cursos nuevos."
      );
      
      // Refresh the courses list
      setTimeout(() => refetch(), 1000);
    } catch (err) {
      setSyncMessage("❌ Error durante la sincronización. Intenta nuevamente.");
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!canTestWhatsApp || !phoneNumber) {
      setWhatsAppStatus("❌ Agrega un número válido en tu perfil para probar WhatsApp.");
      return;
    }

    setIsTestingWhatsApp(true);
    setWhatsAppStatus("Enviando mensaje de prueba...");

    try {
      const displayName = user?.name?.split(" ")[0] ?? "";
      const response = await sendTestWhatsAppMessage({
        phone: phoneNumber,
        text: `Hola ${displayName || ""}! Este es un mensaje de prueba desde Nerdeala para confirmar la conexión de WhatsApp.`.trim(),
      });
      if (response.status === "ok") {
        setWhatsAppStatus(`✅ Mensaje enviado a ${phoneNumber}`);
      } else {
        setWhatsAppStatus("⚠️ No pudimos confirmar el envío. Revisa el número e intenta de nuevo.");
      }
    } catch (error) {
      console.error("WhatsApp test error", error);
      setWhatsAppStatus("❌ Error al enviar el mensaje de prueba. Intenta nuevamente más tarde.");
    } finally {
      setIsTestingWhatsApp(false);
      setTimeout(() => setWhatsAppStatus(null), 6000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="Cargando cursos..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h3 className="font-semibold text-red-900 mb-2">Error al cargar cursos</h3>
        <p className="text-sm text-red-600 mb-4">
          No pudimos obtener la lista de cursos. Verifica tu conexión y permisos.
        </p>
        <Button onClick={() => refetch()} variant="ghost" className="text-xs px-3 py-1">
          Reintentar
        </Button>
      </div>
    );
  }

  const courses = data?.items || [];
  const totalCourses = data?.pagination?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Cursos sincronizados</h2>
          <p className="text-sm text-neutral-600 mt-1">
            {totalCourses === 0 
              ? "No hay cursos sincronizados aún" 
              : `${totalCourses} curso${totalCourses === 1 ? '' : 's'} disponible${totalCourses === 1 ? '' : 's'}`
            }
          </p>
          {/* Debug info */}
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${isDemoMode ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
              {isDemoMode ? `🎭 DEMO: ${demoRole?.toUpperCase() || 'N/A'}` : '📡 MODO NORMAL'}
            </span>
            <span className="text-xs text-gray-500">
              {isDemoMode ? 'Simulando' : 'Usuario'}: {isDemoMode ? demoRole : user?.role || 'sin rol'} | Items: {data?.items?.length || 0}
            </span>
          </div>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          variant="secondary"
        >
          {isSyncing ? "Sincronizando..." : "Sincronizar ahora"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-800">Prueba la integración de WhatsApp</p>
          <p className="text-xs text-neutral-500">
            Número configurado: {phoneNumber ? <span className="font-semibold text-neutral-700">{phoneNumber}</span> : "sin registrar"}
          </p>
          {whatsAppStatus && (
            <p className={`text-xs ${whatsAppStatus.includes('❌') || whatsAppStatus.includes('⚠️') ? 'text-red-500' : 'text-success'}`}>
              {whatsAppStatus}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="self-start text-primary hover:bg-primary/5"
          disabled={!canTestWhatsApp || isTestingWhatsApp}
          onClick={handleTestWhatsApp}
        >
          {isTestingWhatsApp ? "Enviando prueba..." : "Enviar prueba de WhatsApp"}
        </Button>
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div className={`rounded-xl border p-4 ${
          syncMessage.includes('❌') 
            ? 'border-red-200 bg-red-50 text-red-600'
            : 'border-blue-200 bg-blue-50 text-blue-600'
        }`}>
          <p className="text-sm">{syncMessage}</p>
        </div>
      )}

      {/* Courses Grid */}
      {courses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="space-y-3">
            <div className="mx-auto w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="space-y-1">
              {isDemoMode ? (
                <>
                  <h3 className="text-lg font-medium text-neutral-900">No hay cursos para tu rol</h3>
                  <p className="text-sm text-neutral-600 max-w-sm mx-auto">
                    En modo demo, los cursos disponibles dependen de tu rol de usuario. {user?.role === 'student' ? 'Como estudiante, verías solo los cursos en los que estás inscrito.' : user?.role === 'teacher' ? 'Como profesor, verías los cursos que impartes.' : 'Como coordinador, verías todos los cursos del sistema.'}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-neutral-900">No hay cursos sincronizados</h3>
                  <p className="text-sm text-neutral-600 max-w-sm mx-auto">
                    Haz clic en &quot;Sincronizar ahora&quot; para importar tus cursos desde Google Classroom
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Demo Feature Showcase */}
      <DemoFeatureShowcase />
    </div>
  );
}

export default function PanelCursosPage() {
  return (
    <RoleGuard allowed={["admin", "coordinator", "teacher", "student"]}>
      <section className="space-y-6">
        <CoursesContent />
      </section>
    </RoleGuard>
  );
}
