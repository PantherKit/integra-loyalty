'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { decodeJwtClaims, clearToken, homeForRole } from '@/lib/api';

/**
 * Guard + shell mobile-first para sales_rep. Bottom-nav fija con 3 íconos.
 * Touch targets ≥44px. Sin hover-only interactions.
 */
export default function SalesRepLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const claims = decodeJwtClaims();
    if (!claims) {
      router.replace('/login');
      return;
    }
    if (claims.role !== 'sales_rep') {
      // Rol ajeno a esta consola → lo mandamos a la suya, no a /dashboard a ciegas.
      router.replace(homeForRole(claims.role));
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">
        Verificando acceso…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="px-4 h-12 flex items-center justify-between">
          <span className="font-semibold text-zinc-900 text-sm">Integra · Mi cartera</span>
          <button
            onClick={() => {
              clearToken();
              router.replace('/login');
            }}
            className="text-xs text-zinc-500"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-zinc-200 z-10">
        <div className="grid grid-cols-3 max-w-md mx-auto">
          <NavItem href="/sales/rep" label="Inicio" active={pathname === '/sales/rep'} icon="home" />
          <NavItem
            href="/sales/rep/nuevo-comercio"
            label="Nuevo"
            active={pathname === '/sales/rep/nuevo-comercio'}
            icon="plus"
          />
          <NavItem
            href="/sales/rep/comercios"
            label="Comercios"
            active={pathname.startsWith('/sales/rep/comercios')}
            icon="list"
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: 'home' | 'plus' | 'list';
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center py-3 min-h-[56px] text-xs ${
        active ? 'text-zinc-900' : 'text-zinc-500'
      }`}
    >
      <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon === 'home' && (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10h14V10" />
        )}
        {icon === 'plus' && (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />
        )}
        {icon === 'list' && (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
      <span>{label}</span>
    </Link>
  );
}
