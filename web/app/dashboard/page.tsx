'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Award,
  Gift,
  Plus,
  ScanLine,
  Share2,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import LoyaltyPass from '@/components/LoyaltyPass';
import { useDashboard } from '@/components/dashboard-context';
import { DEFAULT_STAMPS_REQUIRED } from '@/lib/constants';
import {
  getActivity,
  listMyPrograms,
  type LoyaltyProgram,
  type Transaction,
} from '@/lib/api';

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'hace un momento';
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000);
    return `hace ${m} min`;
  }
  if (diff < 86_400_000) {
    const h = Math.floor(diff / 3_600_000);
    return `hace ${h} h`;
  }
  if (diff < 7 * 86_400_000) {
    const dd = Math.floor(diff / 86_400_000);
    return `hace ${dd} día${dd > 1 ? 's' : ''}`;
  }
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export default function ResumenPage() {
  const { merchant } = useDashboard();
  const [activity, setActivity] = useState<Transaction[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const [a, p] = await Promise.all([getActivity(20), listMyPrograms()]);
      setActivity(a.items);
      setPrograms(p.items);
      setError(null);
    } catch {
      if (initial) setError('No pudimos cargar tu actividad. Reintenta en un momento.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProgram = programs.find((p) => p.status === 'active') ?? programs[0] ?? null;
  const stampsGiven = activity
    .filter((t) => t.kind === 'stamp')
    .reduce((sum, t) => sum + t.amount, 0);
  const redemptions = activity.filter((t) => t.kind === 'redeem').length;
  const uniqueCustomers = new Set(
    activity.map((t) => t.customerPhone).filter(Boolean)
  ).size;

  const KPIS = [
    {
      label: 'Clientes activos',
      value: String(uniqueCustomers),
      hint: 'en actividad reciente',
      icon: Users,
    },
    {
      label: 'Sellos otorgados',
      value: String(stampsGiven),
      hint: 'últimas 20 operaciones',
      icon: Plus,
    },
    {
      label: 'Premios canjeados',
      value: String(redemptions),
      hint: 'recompensas entregadas',
      icon: Gift,
    },
    {
      label: 'Programa activo',
      value: activeProgram ? '1' : '0',
      hint: activeProgram ? activeProgram.name : 'crea tu programa',
      icon: Award,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Resumen</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">
            Hola, {merchant?.name ?? 'comercio'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Aquí ves cómo va tu programa de lealtad hoy.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/share/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
          >
            <Share2 size={15} /> Compartir
          </Link>
          <Link
            href="/dashboard/give-stamp/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <ScanLine size={15} /> Dar sello
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon size={18} />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
                {loading ? '—' : k.value}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">{k.label}</div>
              <div className="truncate text-[11px] text-gray-400">{k.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Feed de actividad */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Actividad reciente</h2>
            <button
              onClick={() => load(false)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                className={refreshing ? 'animate-spin' : ''}
              />
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-gray-100"
                />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gray-100 text-gray-400">
                <ScanLine size={20} />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Aún no hay movimientos
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Cuando le des un sello a un cliente, aparecerá aquí.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activity.map((t) => (
                <li
                  key={t.transactionId}
                  className="flex items-center gap-3 py-3"
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      t.kind === 'redeem'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {t.kind === 'redeem' ? (
                      <Gift size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    {t.kind === 'stamp' ? (
                      <p className="text-gray-800">
                        +{t.amount} sello{t.amount > 1 ? 's' : ''} a{' '}
                        <span className="font-medium">{t.customerPhone}</span>
                      </p>
                    ) : (
                      <p className="text-gray-800">
                        Premio canjeado por{' '}
                        <span className="font-medium">{t.customerPhone}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {t.programName} · {t.stampsBefore} → {t.stampsAfter} sellos
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatRelative(t.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Preview de la tarjeta del comercio */}
        <section className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-1 font-semibold text-gray-900">Tu tarjeta</h2>
            <p className="mb-4 text-xs text-gray-500">
              Así la ve tu cliente en su celular.
            </p>
            <div className="flex justify-center">
              <LoyaltyPass
                variant="preview"
                merchantName={merchant?.name ?? 'Tu comercio'}
                brandColor={merchant?.brandColor ?? '#4f46e5'}
                tagline={merchant?.industry}
                programName={activeProgram?.name ?? 'Programa de lealtad'}
                stampsRequired={activeProgram?.stampsRequired ?? DEFAULT_STAMPS_REQUIRED}
                rewardDetail={
                  activeProgram?.rewardDetail ?? 'Tu recompensa aquí'
                }
                stamps={0}
              />
            </div>
            <Link
              href="/dashboard/share/"
              className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              Compartir con clientes
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
