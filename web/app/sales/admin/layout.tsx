'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { decodeJwtClaims, clearToken, homeForRole } from '@/lib/api';
import IntegraLogo from '@/components/IntegraLogo';

/**
 * Guard + shell de la consola de admin (Super Admin / Admin). Redirige si el
 * JWT no tiene rol sales_admin o integra_admin.
 */
export default function SalesAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    const claims = decodeJwtClaims();
    if (!claims) {
      router.replace('/login');
      return;
    }
    if (claims.role !== 'sales_admin' && claims.role !== 'integra_admin') {
      router.replace(homeForRole(claims.role));
      return;
    }
    setRole(claims.role);
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">
        Verificando acceso…
      </div>
    );
  }

  const isSuper = role === 'integra_admin';

  const navItems = [
    { href: '/sales/admin', label: 'Vendedores', exact: true },
    { href: '/sales/admin/reps/new', label: 'Alta de Vendedor', exact: false },
    ...(isSuper
      ? [{ href: '/sales/admin/admins/new', label: 'Alta de Admin', exact: false }]
      : []),
  ];

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Fila superior: marca + rol/salir */}
          <div className="h-14 flex items-center justify-between gap-3">
            <Link href="/sales/admin" className="flex items-center gap-2 shrink-0">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-[#4f7d2a] text-white">
                <IntegraLogo size={20} />
              </span>
              <span className="font-semibold text-zinc-900 leading-tight">
                Integra <span className="text-zinc-400 font-normal">· Sales Org</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-md ${
                  isSuper ? 'bg-[#4f7d2a] text-white' : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {isSuper ? 'Super Admin' : 'Admin'}
              </span>
              <button
                onClick={() => {
                  clearToken();
                  router.replace('/login');
                }}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                Salir
              </button>
            </div>
          </div>
          {/* Nav: scrollable en móvil, sin desbordes */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap px-3 py-2.5 text-sm border-b-2 transition-colors ${
                    active
                      ? 'border-[#4f7d2a] text-[#4f7d2a] font-medium'
                      : 'border-transparent text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
