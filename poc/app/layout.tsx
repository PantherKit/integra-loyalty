import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

const SITE_URL = 'https://lealtad-poc.integra-group.ai';
const TITLE = 'Integra Lealtad — POC';
const DESCRIPTION =
  'Prototipo navegable de la plataforma SaaS de tarjetas de lealtad digital — sin app, en el Apple Wallet o Google Wallet del cliente.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'Integra Lealtad',
    locale: 'es_MX',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Integra Lealtad — POC navegable' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-gray-200/70 bg-white/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-amber-300 grid place-items-center text-white text-xs font-bold">I</span>
              Integra <span className="text-brand-600">Lealtad</span>
            </Link>
            <nav className="flex items-center gap-0.5 text-sm">
              <Link href="/editor/" className="px-3 py-1.5 rounded-full hover:bg-gray-100 text-gray-700">Editor</Link>
              <Link href="/customer/" className="px-3 py-1.5 rounded-full hover:bg-gray-100 text-gray-700">Cliente</Link>
              <Link href="/merchant/" className="px-3 py-1.5 rounded-full hover:bg-gray-100 text-gray-700">Dashboard</Link>
            </nav>
            <div className="ml-auto inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              POC v0
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 text-xs text-gray-500 flex justify-between">
            <span>Integra Group AI · POC navegable</span>
            <span>Confidencial</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
