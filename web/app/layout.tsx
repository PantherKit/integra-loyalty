import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import IntegraWatermark from '@/components/IntegraWatermark';
import PwaRegister from '@/components/PwaRegister';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

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
  themeColor: '#0f0d0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${plusJakarta.variable} ${jetBrainsMono.variable} min-h-screen flex flex-col bg-background font-sans text-foreground antialiased`}>
        {children}
        <IntegraWatermark />
        <PwaRegister />
      </body>
    </html>
  );
}
