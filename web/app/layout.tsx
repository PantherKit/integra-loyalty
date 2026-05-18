import type { Metadata, Viewport } from 'next';
import './globals.css';
import IntegraWatermark from '@/components/IntegraWatermark';
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'Integra Loyalty — by Integra Group AI',
  description:
    'Plataforma SaaS de tarjetas de lealtad digital. Sin app, en Apple y Google Wallet. Hecho por Integra Group AI.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Integra Lealtad',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Integra Lealtad' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        {children}
        <IntegraWatermark />
        <PwaRegister />
      </body>
    </html>
  );
}
