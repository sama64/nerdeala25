"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { syncClassroomCourses } from "@/features/dashboard/api";
import type { Course } from "@/types";

export default function IntegracionGoogleClassroomPage() {
  const [accessToken, setAccessToken] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);

  const syncMutation = useMutation({
    mutationFn: () => syncClassroomCourses(accessToken || "demo-token"),
    onSuccess: (data) => {
      setCourses(data.items);
    }
  });

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Integración con Google Classroom</h1>
        <p className="text-sm text-neutral-600">
          Vincula cursos de Classroom y sincroniza estudiantes en menos de cinco minutos. Si estás en modo demo deja el campo vacío.
        </p>
      </header>

      <Card>
        <CardHeader title="Sincronizar cursos" subtitle="Ingresa el token de acceso OAuth o utiliza el modo demo" />
        <form
          className="flex flex-col gap-4 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            syncMutation.mutate();
          }}
        >
          <Input
            placeholder="Token de acceso de Google"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={syncMutation.isLoading}>
            {syncMutation.isLoading ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Cursos sincronizados" subtitle="Se muestran los cursos más recientes" />
        {syncMutation.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner label="Importando cursos" />
          </div>
        ) : courses.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin datos todavía. Ejecuta la sincronización para traer cursos.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {courses.map((course) => (
              <li key={course.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-neutral-800">{course.name}</h3>
                <p className="mt-1 text-xs text-neutral-500">ID: {course.id}</p>
                {course.description ? <p className="mt-2 text-sm text-neutral-600">{course.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
