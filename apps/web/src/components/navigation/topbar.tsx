"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white/70 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-sm text-neutral-500">Conectado al panel principal</p>
        <h2 className="text-lg font-semibold text-neutral-900">{user ? `Hola, ${user.name}` : "Invitado"}</h2>
      </div>
      {user ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-600">{user.email}</span>
          <Button variant="secondary" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      ) : null}
    </header>
  );
}
