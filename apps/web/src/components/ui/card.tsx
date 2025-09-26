export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-neutral-200 bg-white p-6 shadow-sm ${className ?? ""}`}>{children}</div>;
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-4">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {subtitle ? <p className="text-sm text-neutral-500">{subtitle}</p> : null}
    </header>
  );
}
