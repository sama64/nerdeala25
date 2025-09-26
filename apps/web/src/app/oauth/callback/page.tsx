"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

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

    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (token) {
      completeSocialLogin(token)
        .then(() => {
          router.replace("/panel-progreso");
        })
        .catch(() => {
          setStatus("error");
          setMessage("No pudimos validar la sesión. Vuelve a intentarlo.");
        });
    } else {
      setStatus("error");
      if (error === "access_denied") {
        setMessage("Cancelaste el acceso con Google.");
      } else if (error) {
        setMessage("Google devolvió un error. Intenta nuevamente.");
      } else {
        setMessage("No pudimos procesar la respuesta de Google.");
      }
    }
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
