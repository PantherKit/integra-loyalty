'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Award, LogOut, Plus, Gift, Settings, ScanLine, RefreshCw } from 'lucide-react';
import { clearToken, getMe, getMyMerchant, getToken, getActivity, type Merchant, type Transaction } from '@/lib/api';

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'ahora';
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString('es-MX');
}

export default function DashboardPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [email, setEmail] = useState<string>('');
  const [activity, setActivity] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    try {
      const result = await getActivity(20);
      setActivity(result.items);
    } catch {
      // silent — el primer load ya falla con mensaje claro si auth está mal
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login/'); return; }
    Promise.all([getMe(), getMyMerchant(), getActivity(20)])
      .then(([me, m, a]) => { setEmail(me.claims.email); setMerchant(m); setActivity(a.items); })
      .catch(() => { setError('Sesión inválida. Vuelve a entrar.'); setTimeout(() => router.push('/login/'), 1500); })
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/');
  }

  if (loading) return <main className="flex-1 grid place-items-center"><div className="text-gray-500">Cargando…</div></main>;
  if (error) return <main className="flex-1 grid place-items-center"><div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div></main>;

  const stampsGiven = activity.filter((t) => t.kind === 'stamp').reduce((sum, t) => sum + t.amount, 0);
  const redemptions = activity.filter((t) => t.kind === 'redeem').length;
  const uniqueCustomers = new Set(activity.map((t) => t.customerPhone)).size;

  const KPIS = [
    { label: 'Sellos otorgados', value: String(stampsGiven), hint: 'historial reciente', icon: Plus },
    { label: 'Canjes', value: String(redemptions), hint: 'premios entregados', icon: Gift },
    { label: 'Clientes únicos', value: String(uniqueCustomers), hint: 'recientes activos', icon: Users },
    { label: 'Transacciones', value: String(activity.length), hint: 'últimas 20', icon: Award },
  ];

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
        <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Comercio</p>
            <h1 className="text-2xl font-semibold tracking-tight">{merchant?.name}</h1>
            <p className="text-sm text-gray-600 mt-0.5">Industria: {merchant?.industry} · plan free · slug <code className="bg-gray-100 px-1 rounded">{merchant?.slug}</code></p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard/programs/" className="inline-flex items-center gap-1.5 text-sm border border-gray-200 bg-white rounded-lg px-3 py-2 hover:border-gray-400">
              <Settings size={14} /> Programas
            </a>
            <a href="/dashboard/give-stamp/" className="inline-flex items-center gap-1.5 text-sm bg-brand-600 text-white rounded-lg px-3 py-2 hover:bg-brand-700">
              <ScanLine size={14} /> Dar sellos
            </a>
          </div>
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

        <div className="grid lg:grid-cols-3 gap-3 mb-6">
          {/* Activity feed */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Actividad reciente</h3>
              <button onClick={refresh} disabled={refreshing} className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 disabled:opacity-50">
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? '…' : 'Refrescar'}
              </button>
            </div>
            {activity.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                Aún no hay actividad. Cuando empieces a dar sellos, aparecerá aquí.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activity.map((t) => (
                  <li key={t.transactionId} className="flex items-center gap-3 py-3">
                    <div className={`w-8 h-8 rounded-md grid place-items-center ${t.kind === 'redeem' ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'}`}>
                      {t.kind === 'redeem' ? <Gift size={14} /> : <Plus size={14} />}
                    </div>
                    <div className="flex-1 text-sm">
                      <div>
                        {t.kind === 'stamp' ? (
                          <>+{t.amount} sello{t.amount > 1 ? 's' : ''} a <span className="font-medium">{t.customerPhone}</span></>
                        ) : (
                          <>Canje de premio <span className="font-medium">({t.programName})</span> · <span className="text-gray-600">{t.customerPhone}</span></>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{t.stampsBefore} → {t.stampsAfter}</div>
                    </div>
                    <div className="text-xs text-gray-500">{formatRelative(t.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick share */}
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
            <h3 className="font-semibold mb-2">Comparte tu link</h3>
            {merchant && (
              <p className="text-sm text-gray-700 mb-2 break-all">
                <a href={`/c/?s=${merchant.slug}`} className="text-brand-600 hover:underline">/c/?s={merchant.slug}</a>
              </p>
            )}
            <p className="text-xs text-gray-500 mb-4">El cliente abre, da su teléfono y obtiene su tarjeta al instante.</p>
            <a href="/dashboard/give-stamp/" className="block text-center bg-white border border-brand-200 text-brand-700 hover:bg-brand-100 rounded-lg px-4 py-2 text-sm font-medium">
              Dar sellos a un cliente →
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
