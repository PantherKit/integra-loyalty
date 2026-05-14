import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Integra Loyalty — Dashboard',
  description: 'Plataforma SaaS de tarjetas de lealtad digital. Hecho por Integra Group AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
