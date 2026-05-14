'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, DollarSign, Smartphone, Award, LogOut } from 'lucide-react';
import { clearToken, getMe, getMyMerchant, getToken, type Merchant } from '@/lib/api';

const KPIS = [
  { label: 'Clientes activos', value: '0', hint: 'aún sin clientes', icon: Users },
  { label: 'MRR estimado', value: '$0', hint: 'plan gratuito', icon: DollarSign },
  { label: 'Tasa de canje', value: '—', hint: 'sin datos', icon: Award },
  { label: 'Adopción Wallet', value: '—', hint: 'sin datos', icon: Smartphone },
];

export default function DashboardPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login/'); return; }
    Promise.all([getMe(), getMyMerchant()])
      .then(([me, m]) => { setEmail(me.claims.email); setMerchant(m); })
      .catch((err) => { setError('Sesión inválida. Vuelve a entrar.'); setTimeout(() => router.push('/login/'), 1500); })
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/');
  }

  if (loading) {
    return <main className="flex-1 grid place-items-center"><div className="text-gray-500">Cargando…</div></main>;
  }

  if (error) {
    return <main className="flex-1 grid place-items-center"><div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div></main>;
  }

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <span className="font-semibold tracking-tight">Integra <span className="text-brand-600">Loyalty</span></span>
          <span className="ml-auto text-sm text-gray-500">{email}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1">
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-gray-500">Comercio</p>
          <h1 className="text-2xl font-semibold tracking-tight">{merchant?.name}</h1>
          <p className="text-sm text-gray-600 mt-0.5">Industria: {merchant?.industry} · plan free · tenant {merchant?.tenantId.slice(0, 8)}…</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {KPIS.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon size={18} /></div>
                </div>
                <div className="text-2xl font-semibold tracking-tight">{k.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{k.label} · {k.hint}</div>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold mb-2">Próximos pasos</h3>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>
              <a href="/dashboard/programs/" className="text-brand-600 hover:underline">Configurar tu programa de lealtad</a>
            </li>
            <li>Compartir el link público de tu comercio con clientes</li>
            <li>Conectar Apple Wallet + Google Wallet (próximamente — Slice 2B)</li>
            <li>Ver métricas reales en este dashboard (próximamente — Slice 3)</li>
          </ol>
        </div>

        <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
          <h3 className="font-semibold mb-2">Comparte tu programa</h3>
          {merchant && (
            <p className="text-sm text-gray-700 mb-1">
              Link público: <a href={`/c/?s=${merchant.slug}`} className="text-brand-600 hover:underline">/c/?s={merchant.slug}</a>
            </p>
          )}
          <p className="text-xs text-gray-500">Cualquier cliente abre este link, da su teléfono y obtiene su tarjeta digital al instante.</p>
        </div>
      </main>
    </>
  );
}
