"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";

export default function AutenticacionPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const googleLoginUrl = `${env.apiBaseUrl}/api/v1/auth/google/login`;

  useEffect(() => {
    if (!loading && user) {
      router.replace("/panel-progreso");
    }
  }, [loading, router, user]);

  const handleGoogleLogin = () => {
    setStatus("processing");
    if (typeof window === "undefined") return;
    const redirectUri = `${window.location.origin}/oauth/callback`;
    const target = `${googleLoginUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = target;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-white to-success/10 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">Accede con Google</h1>
          <p className="text-sm text-neutral-500">
            Conecta tu cuenta institucional de Google para sincronizar Classroom y ver métricas en tiempo real.
          </p>
        </div>

        <div className="space-y-4">
          <Button className="w-full" onClick={handleGoogleLogin} disabled={status === "processing"}>
            {status === "processing" ? "Redirigiendo…" : "Continuar con Google"}
          </Button>
          <p className="text-xs text-neutral-400">
            Te redirigiremos al servicio de autenticación de Google. Después volverás a Nerdeala automáticamente.
          </p>
        </div>

        <p className="text-center text-xs text-neutral-400">
          ¿Problemas para ingresar? Contacta al equipo de coordinación para restablecer el acceso.
        </p>
      </div>
    </div>
  );
}
