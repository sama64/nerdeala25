"use client";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/components/auth-provider";
import type { Role } from "@/types";

interface RoleGuardProps {
  allowed: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ allowed, children, fallback }: RoleGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-neutral-200 bg-white">
        <Spinner label="Cargando" />
      </div>
    );
  }

  if (!user?.role || !allowed.includes(user.role)) {
    return (
      fallback ?? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-neutral-900">Sin permisos</h2>
          <p className="mt-2 text-sm text-neutral-600">
            No tienes permisos para acceder a esta sección.
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
