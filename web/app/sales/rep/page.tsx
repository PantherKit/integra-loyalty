'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getKpisMe, getKpisMerchantsByRep, decodeJwtClaims, type SalesRepKpi, type SalesMerchantKpi } from '@/lib/api';

export default function SalesRepHome() {
  const [me, setMe] = useState<SalesRepKpi | null>(null);
  const [merchants, setMerchants] = useState<SalesMerchantKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-5 max-w-md mx-auto">
      <section>
        <h1 className="text-xl font-bold text-zinc-900">Mi cartera</h1>
        <p className="text-xs text-zinc-500">Últimos 30 días</p>
      </section>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {loading && <KpiSkeleton />}

      {me && !loading && (
        <section className="grid grid-cols-2 gap-3">
          <KpiCard label="Comercios" value={me.merchantsCount} />
          <KpiCard label="Tarjetas emitidas" value={me.cardsIssuedCount} />
          <KpiCard label="MRR atribuible" value={`$${me.mrrMxn.toLocaleString('es-MX')}`} sub="MXN/mes" />
          <KpiCard
            label="Churn risk"
            value={me.churnRiskCount}
            tone={me.churnRiskCount > 0 ? 'warn' : 'normal'}
          />
        </section>
      )}

      <section className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-900">Tus comercios</h2>
          <Link
            href="/sales/rep/nuevo-comercio"
            className="text-xs text-zinc-900 underline"
          >
            + Nuevo
          </Link>
        </div>

        {!loading && merchants.length === 0 && (
          <div className="bg-white border border-dashed border-zinc-300 rounded-lg p-6 text-center">
            <p className="text-sm text-zinc-600 mb-3">
              Aún no tienes comercios en tu cartera.
            </p>
            <Link
              href="/sales/rep/nuevo-comercio"
              className="inline-block bg-zinc-900 text-white px-4 py-2 rounded text-sm"
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
              className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg p-3 min-h-[60px] active:bg-zinc-50"
            >
              <div>
                <div className="font-medium text-zinc-900 text-sm">{m.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {m.cardsCount} tarjetas · {m.subscriptionStatus ?? 'sin suscripción'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-zinc-900">
                  ${m.mrrMxn.toLocaleString('es-MX')}
                </div>
                <div className="text-[10px] text-zinc-400 uppercase">MXN/mes</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'normal' | 'warn';
}) {
  const valueColor = tone === 'warn' && value !== 0 ? 'text-red-700' : 'text-zinc-900';
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-xl font-semibold mt-0.5 ${valueColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-400">{sub}</div>}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-zinc-200 rounded-lg p-3 h-16 animate-pulse" />
      ))}
    </div>
  );
}
