"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { syncClassroomCourses } from "@/features/dashboard/api";
import { resolveDashboardRoute } from "@/lib/auth";
import { hasCompletedOnboardingSync, markOnboardingCompleted, updateOnboardingState } from "@/lib/onboarding";
import type { Role } from "@/types";
import type { ApiError } from "@/lib/fetcher";

const steps = [
  { id: "role", title: "Define tu rol" },
  { id: "whatsapp", title: "WhatsApp & notificaciones" },
  { id: "sync", title: "Sincroniza Classroom" },
  { id: "done", title: "Todo listo" }
] as const;

type StepId = (typeof steps)[number]["id"];

type SyncStatus = "idle" | "running" | "success" | "error";

const roleOptions: Array<{ value: Role; title: string; description: string }> = [
  {
    value: "teacher",
    title: "Docente",
    description: "Accede a tus cursos, seguimiento de estudiantes y disparo de notificaciones."
  },
  {
    value: "coordinator",
    title: "Coordinador",
    description: "Visión global de cohortes, filtros por docente y control de campañas."
  },
  {
    value: "student",
    title: "Estudiante",
    description: "Consulta tu progreso personal, entregas pendientes y recordatorios."
  }
];

function resolveApiError(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    const apiError = error as ApiError;
    if (apiError.details && typeof apiError.details === "object" && "detail" in apiError.details) {
      const detail = apiError.details.detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
    }
    if (typeof apiError.message === "string" && apiError.message.trim()) {
      return apiError.message;
    }
  }
  return "No pudimos completar esta acción. Intenta nuevamente.";
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading, googleAccessToken, refreshSession } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState("");
  const [optInWhatsApp, setOptInWhatsApp] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncedCourses, setSyncedCourses] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/autenticacion");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!loading && user) {
      if (hasCompletedOnboardingSync(user.id)) {
        router.replace(resolveDashboardRoute(user.role));
      }
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (user?.role && !selectedRole) {
      setSelectedRole(user.role);
    }
  }, [selectedRole, user?.role]);

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const canProceed = useMemo(() => {
    if (!user) return false;
    switch (currentStep.id) {
      case "role":
        return Boolean(selectedRole);
      case "whatsapp":
        return optInWhatsApp ? phone.trim().length >= 8 : true;
      case "sync":
        return syncStatus === "success" || syncStatus === "error";
      case "done":
        return true;
      default:
        return true;
    }
  }, [currentStep.id, optInWhatsApp, phone, selectedRole, syncStatus, user]);

  const saveStepData = async () => {
    if (!user) return false;

    try {
      setIsSaving(true);
      setSaveError(null);

      const payload: Parameters<typeof updateOnboardingState>[0] = {};

      // Save data based on current step
      switch (currentStep.id) {
        case "role":
          if (selectedRole) {
            payload.role = selectedRole;
          }
          break;
        case "whatsapp":
          payload.whatsapp_opt_in = optInWhatsApp;
          if (optInWhatsApp && phone.trim()) {
            payload.phone_e164 = phone.trim();
          }
          break;
        case "done":
          payload.completed = true;
          break;
      }

      if (Object.keys(payload).length > 0) {
        await updateOnboardingState(payload);
        
        // Refresh user session to update role and onboarding state
        await refreshSession();
      }

      return true;
    } catch (error) {
      setSaveError(resolveApiError(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (isSaving) return;

    // Save current step data to API
    const saved = await saveStepData();
    if (!saved && saveError) return;

    if (isLastStep) {
      if (user) {
        markOnboardingCompleted(user.id);
        router.replace(resolveDashboardRoute(user.role));
      }
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const triggerSync = async () => {
    if (!googleAccessToken) {
      setSyncStatus("error");
      setSyncMessage(
        "Necesitamos el token de Google para sincronizar. Vuelve a iniciar sesión o solicita re-autenticación."
      );
      return;
    }

    setSyncStatus("running");
    setSyncMessage("Sincronizando tus cursos y participantes desde Classroom...");

    try {
      const response = await syncClassroomCourses(googleAccessToken);
      const count = Number.isFinite(response.count) ? response.count : response.items.length;
      setSyncedCourses(count);
      setSyncStatus("success");
      setSyncMessage(
        count > 0
          ? `Listo. Registramos ${count} curso${count === 1 ? "" : "s"} para tu panel.`
          : "Sincronización completada. No encontramos cursos aún, pero seguiremos verificando."
      );
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(resolveApiError(error));
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Spinner label="Preparando tu experiencia" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-neutral-400">Primeros pasos</p>
            <h1 className="text-2xl font-semibold text-neutral-900">Hola {user.name.split(" ")[0]}, configuremos Scholaris</h1>
          </div>
          <span className="rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            Paso {stepIndex + 1} de {steps.length}
          </span>
        </div>

        <ol className="flex flex-wrap gap-3 text-sm">
          {steps.map((step, index) => {
            const reached = index <= stepIndex;
            return (
              <li
                key={step.id}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 ${
                  reached ? "border-primary bg-primary/10 text-primary" : "border-neutral-200 text-neutral-500"
                }`}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-semibold">
                  {index + 1}
                </span>
                {step.title}
              </li>
            );
          })}
        </ol>

        <section className="space-y-6 rounded-2xl bg-white p-8 shadow-sm">
          {currentStep.id === "role" ? (
            <div className="space-y-4">
              <header className="space-y-1">
                <h2 className="text-xl font-semibold text-neutral-900">Elige cómo usarás Scholaris</h2>
                <p className="text-sm text-neutral-600">
                  Esto personaliza la navegación y los accesos directos que verás en el panel. Podrás cambiarlo más
                  adelante con ayuda del equipo.
                </p>
              </header>
              <div className="grid gap-4 md:grid-cols-3">
                {roleOptions.map((option) => {
                  const active = selectedRole === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={active}
                        onChange={() => setSelectedRole(option.value)}
                        className="sr-only"
                      />
                      <h3 className="text-base font-semibold">{option.title}</h3>
                      <p className="mt-2 text-sm text-neutral-600">{option.description}</p>
                      {user.role === option.value ? (
                        <p className="mt-3 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                          Rol actual
                        </p>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {currentStep.id === "whatsapp" ? (
            <div className="space-y-6">
              <header className="space-y-1">
                <h2 className="text-xl font-semibold text-neutral-900">Sincroniza mensajes por WhatsApp</h2>
                <p className="text-sm text-neutral-600">
                  Recibirás recordatorios y podrás enviar notificaciones a tus estudiantes cuando activemos la bandeja
                  de difusión. Puedes actualizar este número en cualquier momento.
                </p>
              </header>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={optInWhatsApp}
                    onChange={(event) => setOptInWhatsApp(event.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                  />
                  Quiero recibir notificaciones por WhatsApp
                </label>
                {optInWhatsApp ? (
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-neutral-700">
                      Número de WhatsApp (formato internacional)
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+5491122334455"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                    <p className="text-xs text-neutral-500">
                      Guardaremos este número para enviar recordatorios relacionados con tus cursos.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">
                    Podrás activar las notificaciones más adelante desde el panel de configuración.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {currentStep.id === "sync" ? (
            <div className="space-y-6">
              <header className="space-y-1">
                <h2 className="text-xl font-semibold text-neutral-900">Sincroniza tus cursos de Classroom</h2>
                <p className="text-sm text-neutral-600">
                  Lanzaremos una sincronización inicial para traer cursos, participantes, tareas y entregas. Esta acción
                  puede tardar unos segundos.
                </p>
              </header>
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
                <ul className="list-disc space-y-2 pl-5">
                  <li>Conectaremos con Google Classroom usando tus credenciales verificadas.</li>
                  <li>Guardaremos la lista de cursos, docentes, estudiantes y asignaciones.</li>
                  <li>Podrás revisar el progreso desde el panel una vez finalice la importación.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <Button onClick={triggerSync} disabled={syncStatus === "running"}>
                  {syncStatus === "running" ? "Sincronizando…" : "Iniciar sincronización"}
                </Button>
                {syncMessage ? (
                  <p
                    className={`text-sm ${
                      syncStatus === "error" ? "text-red-600" : "text-neutral-600"
                    }`}
                  >
                    {syncMessage}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {currentStep.id === "done" ? (
            <div className="space-y-6">
              <header className="space-y-1">
                <h2 className="text-xl font-semibold text-neutral-900">¡Excelente! Dejamos todo listo</h2>
                <p className="text-sm text-neutral-600">
                  Resumen rápido de tu configuración inicial. Podrás ajustar cualquier punto desde el panel en otra voz.
                </p>
              </header>
              <dl className="grid gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm">
                <div className="space-y-1">
                  <dt className="font-semibold text-neutral-700">Rol principal</dt>
                  <dd className="text-neutral-600">{selectedRole ? labelForRole(selectedRole) : "Por confirmar"}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="font-semibold text-neutral-700">WhatsApp</dt>
                  <dd className="text-neutral-600">
                    {optInWhatsApp ? (phone ? `Número registrado: ${phone}` : "Activado, pendiente registrar número") : "Desactivado"}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="font-semibold text-neutral-700">Sincronización inicial</dt>
                  <dd className="text-neutral-600">
                    {syncedCourses !== null
                      ? `Cursos encontrados: ${syncedCourses}`
                      : "Sincronización pendiente"}
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-neutral-500">
                Próximos pasos sugeridos: revisa tu panel, explora los cursos importados y configura notificaciones
                específicas en la sección correspondiente.
              </p>
            </div>
          ) : null}
        </section>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{saveError}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={stepIndex === 0 || isSaving}>
            Volver
          </Button>
          <Button onClick={handleContinue} disabled={!canProceed || isSaving}>
            {isSaving ? "Guardando..." : isLastStep ? "Ir al panel" : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function labelForRole(role: Role) {
  switch (role) {
    case "admin":
      return "Administrador";
    case "coordinator":
      return "Coordinador";
    case "teacher":
      return "Docente";
    case "student":
      return "Estudiante";
    default:
      return role;
  }
}
