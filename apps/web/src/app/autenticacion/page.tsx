"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const roles = [
  { value: "admin", label: "Administrador" },
  { value: "teacher", label: "Docente" },
  { value: "coordinator", label: "Coordinador" },
  { value: "student", label: "Estudiante" }
];

export default function AutenticacionPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "teacher" });
  const [notice, setNotice] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        router.push("/panel-progreso");
      } else {
        await register(form);
        setNotice("Revisa tu correo para confirmar la cuenta antes de iniciar sesión.");
        setMode("login");
      }
    } catch (error) {
      setNotice("Ocurrió un error. Verifica los datos y vuelve a intentar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-white to-success/10 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">{mode === "login" ? "Accede al panel" : "Crea tu cuenta"}</h1>
          <p className="text-sm text-neutral-500">
            {mode === "login"
              ? "Ingresa con tu correo institucional para revisar métricas y notificaciones."
              : "Completa tus datos para habilitar la integración con Classroom."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500" htmlFor="name">
                Nombre completo
              </label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                required
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500" htmlFor="email">
              Correo electrónico
            </label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500" htmlFor="password">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
              minLength={8}
              required
            />
          </div>

          {mode === "register" ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500" htmlFor="role">
                Rol en la plataforma
              </label>
              <Select
                id="role"
                value={form.role}
                onChange={(event) => setForm((state) => ({ ...state, role: event.target.value }))}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Procesando..." : mode === "login" ? "Iniciar sesión" : "Registrarme"}
          </Button>
        </form>

        {notice ? <p className="text-center text-sm text-neutral-500">{notice}</p> : null}

        <p className="text-center text-xs text-neutral-500">
          {mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
          >
            {mode === "login" ? "Crear cuenta" : "Iniciar sesión"}
          </button>
        </p>

        <p className="text-center text-xs text-neutral-400">
          <Link href="/" className="hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
