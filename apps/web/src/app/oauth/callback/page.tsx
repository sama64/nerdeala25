"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-client";
import type { ApiError } from "@/lib/fetcher";

function resolveErrorMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error && typeof (error as { message: unknown }).message === "string") {
    const apiError = error as ApiError;
    if (apiError.details && typeof apiError.details === "object" && "detail" in apiError.details) {
      const detail = apiError.details.detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
    }
    return apiError.message;
  }
  return "No pudimos validar la sesión. Vuelve a intentarlo.";
}

type ExchangeResponse = {
  access_token: string;
  expires_at: string;
  token_type: string;
};

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeSocialLogin } = useAuth();
  const [status, setStatus] = useState<"processing" | "error">("processing");
  const [message, setMessage] = useState("Confirmando tu cuenta de Google...");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const error = searchParams.get("error");
    if (error) {
      setStatus("error");
      if (error === "access_denied") {
        setMessage("Cancelaste el acceso con Google.");
      } else {
        setMessage("Google devolvió un error. Intenta nuevamente.");
      }
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setStatus("error");
      setMessage("No pudimos procesar la respuesta de Google.");
      return;
    }

    apiPost<ExchangeResponse>("/api/v1/auth/google/exchange", { code, state })
      .then(async (response) => {
        await completeSocialLogin(response.access_token);
        router.replace("/panel-progreso");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(resolveErrorMessage(err));
      });
  }, [completeSocialLogin, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-white to-success/10 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-semibold text-neutral-900">
          {status === "processing" ? "Conectando tu cuenta" : "No pudimos iniciar sesión"}
        </h1>
        <p className="text-sm text-neutral-500">{message}</p>
        {status === "error" ? (
          <Button onClick={() => router.replace("/autenticacion")} className="w-full">
            Volver a intentar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
