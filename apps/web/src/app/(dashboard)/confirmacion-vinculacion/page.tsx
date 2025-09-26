export default function ConfirmacionVinculacionPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6 rounded-xl border border-success/30 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-semibold text-success">¡Cuenta vinculada con éxito!</h1>
      <p className="text-sm text-neutral-600">
        La integración con Google Classroom quedó activa. A partir de ahora, los cursos y las entregas se sincronizarán de
        forma automática cada vez que ingreses o presiones el botón de sincronización manual en la sección de integración.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <ConfirmationStep title="Sincronización" description="Verifica que los cursos estén visibles en el panel de progreso." />
        <ConfirmationStep title="Revisión" description="Revisa que los estudiantes tengan su progreso actualizado." />
        <ConfirmationStep title="Alertas" description="Configura notificaciones rápidas para tareas próximas a vencer." />
      </div>
    </section>
  );
}

function ConfirmationStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
      <p className="mt-2 text-xs text-neutral-500">{description}</p>
    </div>
  );
}
