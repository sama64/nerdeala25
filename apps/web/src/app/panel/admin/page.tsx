"use client";

import { RoleGuard } from "@/components/auth/role-guard";

export default function PanelAdminPage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-neutral-900">Panel administrativo</h2>
        <p className="text-sm text-neutral-600">
          Aquí verás el estado general del sistema: usuarios pendientes de aprobación, integraciones activas y
          métricas globales. Próximo paso: conectar estos widgets con los endpoints de administración.
        </p>
      </section>
    </RoleGuard>
  );
}
