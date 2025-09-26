"use client";

import { RoleGuard } from "@/components/auth/role-guard";

export default function PanelCohortesPage() {
  return (
    <RoleGuard allowed={["admin", "coordinator"]}>
      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-neutral-900">Gestión de cohortes</h2>
        <p className="text-sm text-neutral-600">
          Este módulo mostrará los cursos agrupados por cohortes, con filtros por docentes y estado de actividad.
          Implementaremos tablas y filtros basados en React Query conectados al endpoint de cursos.
        </p>
      </section>
    </RoleGuard>
  );
}
