"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AcademicCapIcon,
  AdjustmentsVerticalIcon,
  BellAlertIcon,
  ChartBarIcon,
  CheckCircleIcon,
  EnvelopeOpenIcon,
  UsersIcon
} from "@heroicons/react/24/outline";

const navItems = [
  { href: "/panel-progreso", label: "Panel de progreso", icon: ChartBarIcon },
  { href: "/detalles-estudiante", label: "Detalles de estudiante", icon: UsersIcon },
  { href: "/notificaciones", label: "Notificaciones", icon: BellAlertIcon },
  { href: "/estado-entregas", label: "Estado de entregas", icon: CheckCircleIcon },
  { href: "/seguimiento-asistencia", label: "Asistencia", icon: AcademicCapIcon },
  { href: "/integracion-google-classroom", label: "Integración Classroom", icon: EnvelopeOpenIcon },
  { href: "/confirmacion-vinculacion", label: "Confirmación", icon: AdjustmentsVerticalIcon }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-neutral-200 bg-white/80 backdrop-blur lg:block">
      <div className="sticky top-0 flex h-screen flex-col gap-6 px-6 py-8">
        <div>
          <span className="text-sm font-semibold uppercase tracking-wide text-primary">Nerdeala</span>
          <h1 className="text-xl font-bold text-neutral-900">Vibeathon</h1>
        </div>
        <nav className="space-y-1 text-sm">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                  active ? "bg-primary/10 text-primary" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
