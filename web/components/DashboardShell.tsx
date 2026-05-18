'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutGrid,
  ScanLine,
  Award,
  Share2,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import IntegraLogo from '@/components/IntegraLogo';
import { DashboardCtx } from '@/components/dashboard-context';
import { cn } from '@/lib/cn';
import { clearToken, getMe, getToken, getMyMerchant, type Merchant } from '@/lib/api';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: '/dashboard/', label: 'Resumen', icon: LayoutGrid },
  { href: '/dashboard/give-stamp/', label: 'Dar sello', icon: ScanLine },
  { href: '/dashboard/programs/', label: 'Programa', icon: Award },
  { href: '/dashboard/share/', label: 'Compartir', icon: Share2 },
];

type SessionState =
  | { status: 'checking' }
  | { status: 'ready'; email: string; merchant: Merchant | null }
  | { status: 'denied' };

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionState>({ status: 'checking' });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const token = getToken();
    if (!token) {
      router.replace('/login/');
      return;
    }
    (async () => {
      try {
        const [me, merchant] = await Promise.all([
          getMe(),
          getMyMerchant().catch(() => null),
        ]);
        if (!alive) return;
        setSession({ status: 'ready', email: me.claims.email, merchant });
      } catch {
        if (!alive) return;
        clearToken();
        setSession({ status: 'denied' });
        setTimeout(() => router.replace('/login/'), 1200);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  // cierra el menú móvil al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    clearToken();
    router.replace('/login/');
  }

  if (session.status === 'checking') {
    return (
      <main className="flex-1 grid place-items-center px-4">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
          <p className="text-sm">Verificando tu sesión…</p>
        </div>
      </main>
    );
  }

  if (session.status === 'denied') {
    return (
      <main className="flex-1 grid place-items-center px-4">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Tu sesión expiró. Redirigiéndote para iniciar sesión…
        </div>
      </main>
    );
  }

  const { email, merchant } = session;
  const isActive = (href: string) =>
    href === '/dashboard/'
      ? pathname === '/dashboard' || pathname === '/dashboard/'
      : pathname.startsWith(href.replace(/\/$/, ''));

  const navList = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={18} className={active ? 'text-brand-600' : 'text-gray-400'} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
        <IntegraLogo size={20} />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight">
          Integra <span className="text-brand-600">Loyalty</span>
        </p>
        <p className="truncate text-[11px] text-gray-500 max-w-[140px]">
          {merchant?.name ?? 'Tu comercio'}
        </p>
      </div>
    </div>
  );

  return (
    <DashboardCtx.Provider value={{ email, merchant }}>
      <div className="flex min-h-screen flex-1 bg-gray-50">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
          <div className="border-b border-gray-100 px-5 py-5">{brand}</div>
          <div className="flex-1 overflow-y-auto p-3">{navList}</div>
          <div className="border-t border-gray-100 p-3">
            <p className="truncate px-3 pb-2 text-xs text-gray-400">{email}</p>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={18} className="text-gray-400" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Drawer móvil */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-5">
                {brand}
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar menú"
                  className="text-gray-500 hover:text-gray-900"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">{navList}</div>
              <div className="border-t border-gray-100 p-3">
                <p className="truncate px-3 pb-2 text-xs text-gray-400">{email}</p>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut size={18} className="text-gray-400" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenido */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar móvil */}
          <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
              className="text-gray-600 hover:text-gray-900"
            >
              <Menu size={22} />
            </button>
            {brand}
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardCtx.Provider>
  );
}
