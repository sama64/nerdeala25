"use client";

import Link from "next/link";

import { Sidebar } from "@/components/navigation/sidebar";
import { TopBar } from "@/components/navigation/topbar";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/components/auth-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Spinner label="Verificando sesión" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-neutral-50 text-center">
        <p className="text-sm text-neutral-600">Necesitas iniciar sesión para acceder al panel.</p>
        <Link
          href="/autenticacion"
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
        >
          Ir a autenticación
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
