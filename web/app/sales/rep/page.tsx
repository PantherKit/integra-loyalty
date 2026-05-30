'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getKpisMe,
  getKpisMerchantsByRep,
  decodeJwtClaims,
  type SalesRepKpi,
  type SalesMerchantKpi,
} from '@/lib/api';
import DemoPassGallery from '@/components/DemoPassGallery';

export default function SalesRepHome() {
  const [me, setMe] = useState<SalesRepKpi | null>(null);
  const [merchants, setMerchants] = useState<SalesMerchantKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    const claims = decodeJwtClaims();
    if (!claims?.sub) return;
    let alive = true;
    setLoading(true);
    Promise.all([getKpisMe('30d'), getKpisMerchantsByRep(claims.sub)])
      .then(([meRes, mRes]) => {
        if (!alive) return;
        setMe(meRes as SalesRepKpi);
        setMerchants(mRes.merchants);
      })
      .catch(() => alive && setError('Error cargando tu cartera'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <section className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Mi cartera</h1>
          <p className="text-xs text-zinc-400">Últimos 30 días</p>
        </div>
        <Link
          href="/sales/rep/nuevo-comercio"
          className="inline-flex items-center gap-1.5 bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-2.5 rounded-lg text-sm font-medium min-h-[40px]"
        >
          + Nuevo comercio
        </Link>
      </section>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* KPIs */}
      {loading && <KpiSkeleton />}
      {me && !loading && (
        <section className="grid grid-cols-2 gap-3">
          <KpiCard label="Comercios" value={me.merchantsCount} icon="store" />
          <KpiCard label="Tarjetas emitidas" value={me.cardsIssuedCount} icon="card" />
          <KpiCard
            label="MRR atribuible"
            value={`$${me.mrrMxn.toLocaleString('es-MX')}`}
            sub="MXN / mes"
            icon="money"
            accent
          />
          <KpiCard
            label="Churn risk"
            value={me.churnRiskCount}
            icon="warn"
            tone={me.churnRiskCount > 0 ? 'warn' : 'normal'}
          />
        </section>
      )}

      {/* Lista de comercios */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-900">Tus comercios</h2>
        </div>

        {!loading && merchants.length === 0 && (
          <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-7 text-center">
            <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-zinc-100 text-zinc-400 mb-3">
              <StoreIcon />
            </div>
            <p className="text-sm font-medium text-zinc-700">Aún no tienes comercios</p>
            <p className="text-sm text-zinc-400 mt-0.5 mb-4">
              Registra tu primer comercio para empezar a generar comisión.
            </p>
            <Link
              href="/sales/rep/nuevo-comercio"
              className="inline-block bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              Registrar el primero
            </Link>
          </div>
        )}

        <div className="space-y-2">
          {merchants.map((m) => (
            <Link
              key={m.merchantId}
              href={`/sales/rep/comercios?id=${encodeURIComponent(m.merchantId)}`}
              className="flex items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl p-4 min-h-[64px] active:bg-zinc-50"
            >
              <div className="min-w-0">
                <div className="font-medium text-zinc-900 text-sm truncate">{m.name}</div>
                <div className="mt-1 flex items-center gap-2">
                  <SubscriptionBadge status={m.subscriptionStatus} />
                  <span className="text-xs text-zinc-400">{m.cardsCount} tarjetas</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-zinc-900 tabular-nums">
                  ${m.mrrMxn.toLocaleString('es-MX')}
                </div>
                <div className="text-[10px] text-zinc-400 uppercase">MXN/mes</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Sección Demo rápida */}
      <section className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setDemoOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-zinc-900">Demo rápida</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Muéstrale al prospecto cómo se ve en su celular
            </p>
          </div>
          <ChevronIcon open={demoOpen} />
        </button>

        {demoOpen && (
          <div className="px-4 pb-5 border-t border-zinc-100 pt-4">
            <DemoPassGallery title="Ejemplos — así se ve en Apple Wallet" />
            <div className="mt-4 space-y-2 text-sm text-zinc-500">
              <p className="font-medium text-zinc-700">¿Cómo usar la demo?</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Muéstrale estas 3 tarjetas al prospecto.</li>
                <li>Dile que la suya puede tener su logo y colores exactos.</li>
                <li>Regístralo con &ldquo;Nuevo comercio&rdquo; → termina el onboarding en 10 min.</li>
              </ol>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Componentes internos ──────────────────────────────────────────────────

type IconName = 'store' | 'card' | 'money' | 'warn';

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: IconName;
  accent?: boolean;
  tone?: 'normal' | 'warn';
}) {
  const valueColor =
    tone === 'warn' && value !== 0 ? 'text-red-700' : accent ? 'text-white' : 'text-zinc-900';
  return (
    <div
      className={`rounded-xl p-3.5 border ${
        accent ? 'bg-[#4f7d2a] border-[#4f7d2a]' : 'bg-white border-zinc-200'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={accent ? 'text-white/80' : 'text-[#4f7d2a]'}>
          <Icon name={icon} />
        </span>
        <span
          className={`text-[10px] uppercase tracking-wide ${
            accent ? 'text-white/80' : 'text-zinc-500'
          }`}
        >
          {label}
        </span>
      </div>
      <div className={`text-xl font-semibold mt-1.5 tabular-nums ${valueColor}`}>{value}</div>
      {sub && (
        <div className={`text-[10px] ${accent ? 'text-white/70' : 'text-zinc-400'}`}>{sub}</div>
      )}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 bg-white h-[88px] animate-pulse" />
      ))}
    </div>
  );
}

function SubscriptionBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trialing: 'bg-blue-100 text-blue-700',
    past_due: 'bg-amber-100 text-amber-700',
    canceled: 'bg-red-100 text-red-700',
  };
  const cls = (status && map[status]) || 'bg-zinc-100 text-zinc-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${cls}`}>
      {status ?? 'sin suscripción'}
    </span>
  );
}

function StoreIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M4 9v11h16V9M4 9h16" />
    </svg>
  );
}

function Icon({ name }: { name: IconName }) {
  const c = 'w-3.5 h-3.5';
  if (name === 'store')
    return (
      <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M4 9v11h16V9M4 9h16" />
      </svg>
    );
  if (name === 'card')
    return (
      <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 7h18v10H3zM7 15h4" />
      </svg>
    );
  if (name === 'warn')
    return (
      <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z" />
      </svg>
    );
  return (
    <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-3-5h6m-9 7h12V6H6z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
