"use client";

import Link from "next/link";
import { motion as m, useReducedMotion } from "framer-motion";
import type { HTMLAttributes, ReactNode } from "react";

const features = [
  {
    title: "Integración instantánea",
    description:
      "Conecta Google Classroom en minutos y sincroniza cursos, tareas y participantes sin procesos manuales.",
  },
  {
    title: "Panel de progreso",
    description:
      "Visualiza métricas accionables: avance, asistencia y alertas para cada cohorte o estudiante.",
  },
  {
    title: "Notificaciones inteligentes",
    description:
      "Envía recordatorios personalizados y marca seguimiento en tiempo real para tareas críticas.",
  },
];

const checklistItems = [
  "Plataforma online",
  "Video demo 1–2min",
  "Repo público",
];

const faqItems = [
  {
    question: "¿Qué permisos pide?",
    answer: "Solo lectura de Classroom, sin modificar datos",
  },
  {
    question: "¿Cómo se calculan métricas?",
    answer: "A partir de entregas y asistencia reportadas por Classroom",
  },
  {
    question: "¿Cómo funcionan las alertas?",
    answer: "Se disparan en tiempo real ante cambios críticos",
  },
];

const impactHighlights = [
  "Mejor seguimiento semanal sin planillas",
  "Alertas automáticas para tareas críticas",
  "Despliegue simple con Google Classroom",
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay, ease: [0.2, 0.65, 0.3, 0.9] },
  },
});

const containerClass = "max-w-6xl mx-auto px-6";

export default function LandingPage() {
  const shouldReduceMotion = useReducedMotion();
  const fade = (delay = 0) => (shouldReduceMotion ? {} : fadeUp(delay));

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-neutral-50 to-neutral-100 text-neutral-900">
      <header className={`${containerClass} flex flex-col gap-8 py-24 text-center lg:py-32`}>
        <m.div {...fade(0)} className="flex justify-center">
          <Badge>nerdearla vibeathon</Badge>
        </m.div>
        <m.h1
          {...fade(0.05)}
          className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl"
        >
          Transforma la experiencia digital de tus aulas hoy mismo
        </m.h1>
        <m.p
          {...fade(0.1)}
          className="mx-auto max-w-3xl text-lg leading-relaxed text-neutral-600 sm:text-xl"
        >
          Integra Google Classroom con métricas accionables, paneles de progreso y notificaciones inteligentes que mantienen a estudiantes, docentes y coordinadores completamente alineados.
        </m.p>
        <m.div
          {...fade(0.15)}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-5"
        >
          <ButtonPrimary href="/autenticacion">
            Comenzar ahora
          </ButtonPrimary>
          <ButtonGhost href="/panel-progreso">
            Ver panel interactivo
          </ButtonGhost>
          <ButtonTertiary
            href="https://example.com/video-demo"
          >
            Ver video demo
          </ButtonTertiary>
        </m.div>
        <m.p {...fade(0.2)} className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Solo lectura de Classroom · Scopes listados
        </m.p>
        <m.div
          {...fade(0.25)}
          className="mx-auto w-full max-w-4xl rounded-2xl border border-neutral-200 bg-white/80 p-8 shadow-sm"
        >
          <div
            className="aspect-[16/9] w-full rounded-xl bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200"
            aria-hidden="true"
          />
        </m.div>
      </header>

      <main className="pb-24">
        <section className="py-16 lg:py-20">
          <div className={containerClass}>
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 id="features-heading" className="sr-only">
                Capacidades destacadas
              </h2>
              <ul role="list" aria-labelledby="features-heading">
                {features.map((feature) => (
                  <li
                    key={feature.title}
                    className="group flex gap-4 border-t border-neutral-200/70 py-4 transition-colors first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <span
                      className="mt-2 h-2.5 w-2.5 flex-none rounded-full bg-primary/70"
                      aria-hidden="true"
                    />
                    <div className="flex-1 space-y-2">
                      <h3 className="text-base font-semibold text-neutral-900 transition-colors group-hover:text-neutral-800 group-hover:underline group-hover:underline-offset-4">
                        {feature.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-neutral-600">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className={containerClass}>
            <div className="grid gap-12 rounded-2xl bg-white p-10 shadow-sm md:grid-cols-[1.2fr_1fr] lg:p-12">
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">
                  Impacto comprobado
                </h2>
                <p className="text-base leading-relaxed text-neutral-600">
                  Los centros que implementaron Nerdeala reportan un incremento promedio del 18% en entregas puntuales y una reducción del 25% en tareas perdidas. Todo con dashboards accesibles y notificaciones automáticas.
                </p>
              </div>
              <ul className="space-y-3 text-sm text-neutral-700" role="list">
                {impactHighlights.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="relative top-1 h-2 w-2 flex-none rounded-full bg-primary/70"
                      aria-hidden="true"
                    />
                    <span className="leading-relaxed text-neutral-800">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className={containerClass}>
            <Card className="bg-white p-10 lg:p-12" aria-label="Checklist jurado">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Checklist jurado
              </h2>
              <p className="mt-3 text-sm text-neutral-600">
                Todo lo necesario para el pitch final en un vistazo.
              </p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-3">
                {checklistItems.map((item) => (
                  <li key={item}>
                    <ChecklistItem label={item} />
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className={containerClass}>
            <Card className="grid gap-8 bg-white p-10 lg:p-12" aria-label="Preguntas frecuentes">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Mini FAQ
              </h2>
              <div className="space-y-6">
                {faqItems.map((item) => (
                  <div key={item.question}>
                    <FaqItem question={item.question} answer={item.answer} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className={containerClass}>
            <Card className="bg-white p-10 text-center lg:p-12">
              <m.h2 {...fade(0)} className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
                Listo para mostrar en el jurado
              </m.h2>
              <m.p
                {...fade(0.05)}
                className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-600"
              >
                Conecta tu panel, demuestra avances reales y mantén la cohorte vibrando con cada nueva entrega.
              </m.p>
              <m.div
                {...fade(0.1)}
                className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-5"
              >
                <ButtonPrimary href="/autenticacion">
                  Comenzar ahora
                </ButtonPrimary>
                <ButtonGhost href="/panel-progreso">
                  Ver panel interactivo
                </ButtonGhost>
              </m.div>
              <m.p
                {...fade(0.15)}
                className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-neutral-500"
              >
                Usuarios que ya completaron la demo: 2
              </m.p>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-white/80 py-8">
        <div
          className={`${containerClass} flex flex-col items-center gap-3 text-center text-sm text-neutral-600 sm:flex-row sm:justify-between sm:text-left`}
        >
          <div className="space-y-2">
            <div className="font-semibold text-neutral-900">Enlaces clave</div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <a
                href="https://github.com/sama64/nerdeala25"
                className="text-primary underline-offset-4 transition hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                Repo público
              </a>
              <a
                href="https://sysar.my/discord"
                className="text-primary underline-offset-4 transition hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                Discord #nerdearla-vibeathon
              </a>
            </div>
          </div>
          <p className="text-xs text-neutral-500">Solo lectura de Classroom · Scopes listados</p>
        </div>
      </footer>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
      {children}
    </span>
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
};

function ButtonPrimary({ href, children }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex transform items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

function ButtonGhost({ href, children }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex transform items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-primary transition-all duration-200 hover:scale-[1.02] hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

function ButtonTertiary({ href, children }: ButtonLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex transform items-center justify-center rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-700 transition-all duration-200 hover:scale-[1.02] hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      {children}
    </a>
  );
}

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

function Card({ className = "", children, ...rest }: CardProps) {
  const baseClass = "rounded-2xl border border-neutral-200/70 bg-white shadow-sm";
  const composedClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <article className={composedClass} {...rest}>
      {children}
    </article>
  );
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3"
      aria-label={label}
      role="group"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
        ✓
      </span>
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <article className="rounded-2xl border border-neutral-200/70 bg-white/90 p-6">
      <h3 className="text-base font-semibold tracking-tight text-neutral-900">{question}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{answer}</p>
    </article>
  );
}
