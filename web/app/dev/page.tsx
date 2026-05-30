'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setDevRole, clearDevRole } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const isLocal = API_URL.includes('localhost');

type Role = {
  label: string;
  tenantId: string;
  userId: string;
  email: string;
  redirect: string;
  bg: string;
};

const ROLES: Role[] = [
  {
    label: 'Super Admin (integra_admin)',
    tenantId: 'INTEGRA',
    userId: '00000000-0000-0000-0000-superadmin01',
    email: 'super_admin@integra.local',
    redirect: '/sales/admin',
    bg: 'bg-purple-600',
  },
  {
    label: 'Sales Admin',
    tenantId: 'INTEGRA',
    userId: '00000000-0000-0000-0000-salesadmin1',
    email: 'sales_admin@integra.local',
    redirect: '/sales/admin',
    bg: 'bg-blue-600',
  },
];

// El rol dev se mapea al mismo string que usa custom:role en Cognito.
const ROLE_MAP: Record<string, string> = {
  'super_admin@integra.local': 'integra_admin',
  'sales_admin@integra.local': 'sales_admin',
};

export default function DevLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  function pick(role: Role) {
    setBusy(role.label);
    const devRole = ROLE_MAP[role.email] ?? 'merchant';
    setDevRole(role.tenantId, role.userId, devRole, role.email);
    setTimeout(() => router.push(role.redirect), 200);
  }

  function reset() {
    clearDevRole();
    window.location.reload();
  }

  if (!isLocal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3">/dev solo en modo local</h1>
          <p className="text-sm text-gray-400">
            Esta página solo está activa cuando NEXT_PUBLIC_API_URL apunta a localhost.
          </p>
          <p className="text-sm text-gray-400 mt-2">API actual: <code>{API_URL || '(no configurada)'}</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Login dev — Integra Loyalty</h1>
          <p className="text-sm text-gray-400 mt-1">
            Elige un rol. Setea x-tenant-id + x-user-id en localStorage y bypasea Cognito mientras la API local corra con ALLOW_HEADER_AUTH=true.
          </p>
        </div>

        <div className="space-y-3">
          {ROLES.map((r) => (
            <button
              key={r.userId}
              onClick={() => pick(r)}
              disabled={busy !== null}
              className={`w-full ${r.bg} hover:opacity-90 disabled:opacity-50 rounded-lg p-4 text-left transition`}
            >
              <div className="font-semibold">{r.label}</div>
              <div className="text-xs opacity-80 mt-1">{r.email}</div>
              <div className="text-[10px] opacity-60 mt-2 font-mono">
                tenant={r.tenantId} · userId={r.userId} → {r.redirect}
              </div>
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <span>API: <code>{API_URL}</code></span>
          <button onClick={reset} className="underline hover:text-white">
            limpiar sesión dev
          </button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong className="text-gray-300">Si esto no funciona:</strong> verifica que <code>pnpm dev:up</code> esté corriendo en el repo (deberías ver la API en <code>localhost:3002</code>).
          </p>
          <p>
            Los users locales fueron seedeados desde <code>scripts/dev/seed.ts</code>. Si necesitas crearles datos (programas, clientes), úsalos como super_admin y créalos desde la UI.
          </p>
        </div>
      </div>
    </div>
  );
}
