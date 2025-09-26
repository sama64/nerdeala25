"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolvePostAuthDestination } from "@/lib/auth";
import { env } from "@/lib/env";
import type { ApiError } from "@/lib/fetcher";

const loginSchema = z.object({
  email: z
    .string({ required_error: "Ingresa tu correo institucional" })
    .min(1, "Ingresa tu correo institucional")
    .email("El correo no tiene un formato válido"),
  password: z
    .string({ required_error: "Ingresa tu contraseña" })
    .min(6, "La contraseña debe tener al menos 6 caracteres")
});

type LoginFormValues = z.infer<typeof loginSchema>;

function resolveErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    const apiError = error as ApiError;
    if (apiError.details && typeof apiError.details === "object") {
      const detail = apiError.details.detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
    }
    if (typeof apiError.message === "string" && apiError.message.trim()) {
      return apiError.message;
    }
  }
  return "No pudimos iniciar sesión. Intenta nuevamente.";
}

export default function AutenticacionPage() {
  const router = useRouter();
  const { user, loading, login, onboardingState, onboardingLoading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const googleLoginUrl = `${env.apiBaseUrl}/api/v1/auth/google/login`;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" }
  });

  useEffect(() => {
    if (!loading && !onboardingLoading && user) {
      router.replace(
        resolvePostAuthDestination(user, {
          onboardingCompleted: onboardingState?.completed ?? false
        })
      );
    }
  }, [loading, onboardingLoading, onboardingState?.completed, router, user]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof LoginFormValues, { type: "manual", message: issue.message });
        }
      });
      return;
    }

    try {
      const session = await login(parsed.data.email, parsed.data.password);
      router.replace(
        resolvePostAuthDestination(session.user, {
          onboardingCompleted: session.onboarding?.completed ?? false
        })
      );
    } catch (error) {
      setFormError(resolveErrorMessage(error));
    }
  });

  const handleGoogleLogin = () => {
    if (typeof window === "undefined") return;
    const redirectUri = `${window.location.origin}/oauth/callback`;
    const target = `${googleLoginUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = target;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-white to-success/10 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">Bienvenido a Scholaris</h1>
          <p className="text-sm text-neutral-500">
            Inicia sesión para continuar con tu configuración y acceder al panel según tu rol.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-neutral-700">
              Correo institucional
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="docente@institucion.edu"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            ) : null}
          </div>

          {formError ? <p className="text-xs text-red-600">{formError}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" aria-hidden="true" />
            <span>o continúa con</span>
            <span className="h-px flex-1 bg-neutral-200" aria-hidden="true" />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
          >
            Continuar con Google
          </Button>
        </div>

        <p className="text-center text-xs text-neutral-400">
          ¿Problemas para ingresar? Contacta al equipo de coordinación para restablecer el acceso.
        </p>
      </div>
    </div>
  );
}
