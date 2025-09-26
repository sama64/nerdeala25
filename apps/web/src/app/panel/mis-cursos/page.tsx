"use client";

import { RoleGuard } from "@/components/auth/role-guard";

export default function PanelMisCursosPage() {
  return (
    <RoleGuard allowed={["student"]}>
      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-neutral-900">Mis cursos</h2>
        <p className="text-sm text-neutral-600">
          Aquí los estudiantes verán el progreso de cada materia, próximas entregas y mensajes recientes. La página
          consumirá el endpoint filtrado de cursos o inscripciones una vez definamos la respuesta desde la API.
        </p>
      </section>
    </RoleGuard>
  );
}
