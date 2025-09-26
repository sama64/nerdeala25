import Link from "next/link";


const features = [
  {
    title: "Integración instantánea",
    description: "Conecta Google Classroom en minutos y sincroniza cursos, tareas y participantes sin procesos manuales.",
  },
  {
    title: "Panel de progreso",
    description: "Visualiza métricas accionables: avance, asistencia y alertas para cada cohorte o estudiante.",
  },
  {
    title: "Notificaciones inteligentes",
    description: "Envía recordatorios personalizados y marca seguimiento en tiempo real para tareas críticas.",
  },
];

const testimonials = [
  {
    quote:
      "Desde que usamos Nerdeala tenemos claridad absoluta del progreso semanal. Las alertas nos permiten intervenir a tiempo.",
    author: "María Sánchez",
    role: "Coordinadora académica, InspiraTec",
  },
  {
    quote: "Centralizamos asistencia, entregas y reportes en una sola vista. El equipo docente recuperó horas de gestión.",
    author: "Luis Fernández",
    role: "Director, Colegio Horizonte",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-neutral-100">
      <header className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-24 text-center md:pt-32">
        <div className="mx-auto w-fit rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Nerdeala Vibeathon
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-neutral-900 md:text-5xl">
          Transforma la experiencia digital de tus aulas hoy mismo
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-neutral-600">
          Integra Google Classroom con métricas accionables, paneles de progreso y notificaciones inteligentes que mantienen a estudiantes, docentes y coordinadores completamente alineados.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/autenticacion"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90"
          >
            Comenzar ahora
          </Link>
          <Link href="/panel-progreso" className="text-sm font-semibold text-primary hover:underline">
            Ver el panel interactivo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-6 pb-24">
        <section className="grid gap-8 rounded-2xl bg-white p-10 shadow-lg md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="space-y-2">
              <h3 className="text-lg font-semibold text-neutral-900">{feature.title}</h3>
              <p className="text-sm text-neutral-600">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-10 rounded-2xl bg-primary/5 p-10 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-neutral-900">Impacto comprobado</h2>
            <p className="text-sm text-neutral-600">
              Los centros que implementaron Nerdeala reportan un incremento promedio del 18% en entregas puntuales y una reducción del 25% en tareas perdidas. Todo con dashboards accesibles y notificaciones automáticas.
            </p>
          </div>
          <div className="grid gap-6">
            <ImpactCard title="18%" subtitle="más tareas a tiempo" />
            <ImpactCard title="25%" subtitle="menos incidencias" />
            <ImpactCard title="5 minutos" subtitle="para desplegar todo el panel" />
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <blockquote key={testimonial.author} className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
              <p className="text-base italic text-neutral-700">“{testimonial.quote}”</p>
              <footer className="mt-4 text-sm font-semibold text-neutral-900">{testimonial.author}</footer>
              <p className="text-xs text-neutral-500">{testimonial.role}</p>
            </blockquote>
          ))}
        </section>
      </main>
    </div>
  );
}

function ImpactCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl bg-white p-6 text-center shadow-sm">
      <p className="text-3xl font-semibold text-primary">{title}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">{subtitle}</p>
    </div>
  );
}
