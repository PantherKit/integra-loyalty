'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decodeJwtClaims, clearToken } from '@/lib/api';

/**
 * Guard de la consola de sales_admin. Redirige si el JWT no tiene rol
 * `sales_admin` o `integra_admin` (este último también accede aquí).
 */
export default function SalesAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const claims = decodeJwtClaims();
    if (!claims) {
      router.replace('/login');
      return;
    }
    if (claims.role !== 'sales_admin' && claims.role !== 'integra_admin') {
      router.replace('/dashboard');
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
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/sales/admin" className="font-semibold text-zinc-900">
              Integra · Sales Org
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-600">
              <Link href="/sales/admin" className="hover:text-zinc-900">Vendedores</Link>
              <Link href="/sales/admin/reps/new" className="hover:text-zinc-900">Alta de rep</Link>
            </nav>
          </div>
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
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
