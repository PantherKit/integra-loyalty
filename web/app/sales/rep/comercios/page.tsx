'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getKpisMerchantsByRep, decodeJwtClaims, type SalesMerchantKpi } from '@/lib/api';

export default function MerchantDetailRoute() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-400">Cargando…</div>}>
      <MerchantDetailInner />
    </Suspense>
  );
}

function MerchantDetailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const merchantId = searchParams.get('id') ?? '';

  const [merchant, setMerchant] = useState<SalesMerchantKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const claims = decodeJwtClaims();
    if (!claims?.sub) {
      router.replace('/login');
      return;
    }
    if (!merchantId) {
      router.replace('/sales/rep');
      return;
    }
    let alive = true;
    setLoading(true);
    getKpisMerchantsByRep(claims.sub)
      .then((res) => {
        if (!alive) return;
        const m = res.merchants.find((mm) => mm.merchantId === merchantId);
        if (!m) {
          setError('Comercio no encontrado en tu cartera');
          setTimeout(() => router.replace('/sales/rep'), 1500);
        } else {
          setMerchant(m);
        }
      })
      .catch(() => alive && setError('Error cargando comercio'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [merchantId, router]);

  return (
    <div className="space-y-4">
      <Link
        href="/sales/rep"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-[#4f7d2a]"
      >
        ← Volver
      </Link>

      {loading && (
        <div className="space-y-3">
          <div className="h-20 bg-white border border-zinc-200 rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-zinc-200 rounded-xl animate-pulse" />
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {merchant && !loading && (
        <>
          <section className="bg-white border border-zinc-200 rounded-xl p-4">
            <h1 className="text-xl font-bold text-zinc-900">{merchant.name}</h1>
            <div className="mt-1.5">
              <SubscriptionBadge status={merchant.subscriptionStatus} />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <KpiCard label="Tarjetas activas" value={merchant.cardsCount} />
            <KpiCard
              label="MRR"
              value={`$${merchant.mrrMxn.toLocaleString('es-MX')}`}
              sub="MXN / mes"
              accent
            />
          </section>

          <section className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 text-sm">
            <Row
              label="Última actividad"
              value={
                merchant.lastActivityAt
                  ? new Date(merchant.lastActivityAt).toLocaleDateString('es-MX')
                  : '—'
              }
            />
            <Row label="Estado" value={merchant.status} />
          </section>

          <p className="text-xs text-zinc-400 text-center pt-1 px-4">
            Para emitir sellos o gestionar el programa, el dueño entra a su back
            office con sus credenciales.
          </p>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3.5 border ${
        accent ? 'bg-[#4f7d2a] border-[#4f7d2a]' : 'bg-white border-zinc-200'
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-wide ${
          accent ? 'text-white/80' : 'text-zinc-500'
        }`}
      >
        {label}
      </div>
      <div
        className={`text-xl font-semibold mt-1 tabular-nums ${
          accent ? 'text-white' : 'text-zinc-900'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className={`text-[10px] ${accent ? 'text-white/70' : 'text-zinc-400'}`}>{sub}</div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-4 py-2.5">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-900 font-medium">{value}</span>
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
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>
      {status ?? 'sin suscripción'}
    </span>
  );
}
