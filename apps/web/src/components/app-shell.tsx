"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { Button } from "@/components/ui/button";
import type { Role } from "@/types";

const navConfig: Record<Role, { href: string; label: string }[]> = {
  admin: [
    { href: "/panel/admin", label: "Resumen" },
    { href: "/panel/cohortes", label: "Cohortes" },
    { href: "/panel/cursos", label: "Cursos" },
    { href: "/panel/mis-cursos", label: "Mis cursos" }
  ],
  coordinator: [
    { href: "/panel/coordinador", label: "Panel de Coordinación" },
    { href: "/panel/cohortes", label: "Cohortes" },
    { href: "/panel/cursos", label: "Cursos" }
  ],
  teacher: [{ href: "/panel/cursos", label: "Mis cursos" }],
  student: [{ href: "/panel/mis-cursos", label: "Mis cursos" }]
};

const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  coordinator: "Coordinador",
  teacher: "Docente",
  student: "Estudiante"
};

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const { isDemoMode, demoRole, toggleDemoMode, setDemoRole } = useDemoMode();
  const pathname = usePathname();

  const navItems = useMemo(() => {
    if (!user?.role) return [];
    return navConfig[user.role] ?? [];
  }, [user?.role]);

  const activeLabel = useMemo(() => {
    const current = navItems.find((item) => pathname?.startsWith(item.href));
    return current?.label ?? "Panel";
  }, [navItems, pathname]);

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="hidden w-64 flex-shrink-0 border-r border-neutral-200 bg-white/80 px-6 py-8 backdrop-blur lg:flex lg:flex-col">
        <Link href="/" className="inline-flex items-center" aria-label="Ir a inicio">
          <Image src="/logo.png" alt="Scholaris" width={132} height={40} priority />
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1 text-sm">
          {navItems.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <span>{item.label}</span>
                {active ? <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" /> : null}
              </Link>
            );
          })}
          {navItems.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Completa el onboarding para habilitar el panel.
            </p>
          ) : null}
        </nav>

        {/* Demo Mode Toggle */}
        <div className="mt-6 pt-4 border-t border-neutral-200">
          <Button
            onClick={toggleDemoMode}
            variant={isDemoMode ? "primary" : "ghost"}
            className="w-full text-xs flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {isDemoMode ? "Salir del Demo" : "Modo Demo"}
          </Button>
          
          {isDemoMode && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-orange-600 text-center font-medium">
                🎭 Modo Demo Activo
              </p>
              
              {/* Role Selector */}
              <div className="space-y-1">
                <label className="text-xs text-neutral-600 block">Simular rol:</label>
                <select
                  value={demoRole || 'coordinator'}
                  onChange={(e) => setDemoRole(e.target.value as any)}
                  className="w-full text-xs px-2 py-1 border border-neutral-200 rounded bg-white"
                >
                  <option value="student">👨‍🎓 Estudiante</option>
                  <option value="teacher">👩‍🏫 Profesor/a</option>
                  <option value="coordinator">👨‍💼 Coordinador/a</option>
                  <option value="admin">🔧 Administrador/a</option>
                </select>
                <p className="text-xs text-neutral-500">
                  Funciones disponibles según el rol elegido
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-neutral-400">© {new Date().getFullYear()} Scholaris</div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white/70 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-400">Scholaris Panel</p>
              <h1 className="text-lg font-semibold text-neutral-900">{activeLabel}</h1>
            </div>
            {isDemoMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 border border-orange-300 rounded-full">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-medium text-orange-700">Modo Demo</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-neutral-900">{user?.name ?? "Usuario"}</p>
              <p className="text-xs text-neutral-500">{user?.email ?? ""}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {user?.role ? roleLabels[user.role] : "Sin rol"}
            </span>
            <Button variant="ghost" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
