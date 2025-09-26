"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Protected } from "@/components/auth/protected";
import { AppShell } from "@/components/app-shell";
import { hasCompletedOnboardingSync } from "@/lib/onboarding";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !hasCompletedOnboardingSync(user.id)) {
      router.replace("/onboarding");
    }
  }, [loading, router, user]);

  return (
    <Protected>
      <AppShell>{children}</AppShell>
    </Protected>
  );
}
