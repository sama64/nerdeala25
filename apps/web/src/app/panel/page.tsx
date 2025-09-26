"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Spinner } from "@/components/ui/spinner";
import { resolveDashboardRoute } from "@/lib/auth";
import { hasCompletedOnboardingSync } from "@/lib/onboarding";

export default function PanelHomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role && hasCompletedOnboardingSync(user.id)) {
      router.replace(resolveDashboardRoute(user.role));
    }
  }, [loading, router, user]);

  return (
    <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white text-sm text-neutral-600">
      {loading ? <Spinner label="Preparando panel" /> : "Selecciona una sección desde la barra lateral."}
    </div>
  );
}
