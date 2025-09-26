import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "Nerdeala Vibeathon",
  description:
    "Plataforma educativa para integrar Google Classroom, seguimiento de progreso y analíticas en tiempo real.",
  openGraph: {
    title: "Nerdeala Vibeathon",
    description:
      "Conecta Google Classroom y gestiona el progreso estudiantil con paneles y notificaciones en tiempo real.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-neutral-50 text-neutral-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
