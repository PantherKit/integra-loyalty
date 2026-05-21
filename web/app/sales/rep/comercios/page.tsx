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
    <div className="max-w-md mx-auto space-y-4">
      <Link href="/sales/rep" className="text-sm text-zinc-500">
        ← Volver
      </Link>

      {loading && <div className="text-sm text-zinc-400">Cargando…</div>}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {merchant && (
        <>
          <section>
            <h1 className="text-2xl font-bold text-zinc-900">{merchant.name}</h1>
            <div className="mt-1">
              <SubscriptionBadge status={merchant.subscriptionStatus} />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <KpiCard label="Tarjetas activas" value={merchant.cardsCount} />
            <KpiCard label="MRR" value={`$${merchant.mrrMxn.toLocaleString('es-MX')}`} sub="MXN/mes" />
          </section>

          <section className="bg-white border border-zinc-200 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">Última actividad</span>
              <span className="text-zinc-900">
                {merchant.lastActivityAt
                  ? new Date(merchant.lastActivityAt).toLocaleDateString('es-MX')
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Estado</span>
              <span className="text-zinc-900">{merchant.status}</span>
            </div>
          </section>

          <p className="text-xs text-zinc-400 text-center pt-2">
            Para emitir sellos o gestionar el programa, el dueño del comercio entra desde{' '}
            <span className="text-zinc-600">/dashboard</span> con sus credenciales.
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
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-xl font-semibold text-zinc-900 mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-zinc-400">{sub}</div>}
    </div>
  );
}

function SubscriptionBadge({ status }: { status?: string }) {
  const cls =
    status === 'active'
      ? 'bg-green-100 text-green-700'
      : status === 'trialing'
      ? 'bg-blue-100 text-blue-700'
      : status === 'past_due'
      ? 'bg-amber-100 text-amber-700'
      : status === 'canceled'
      ? 'bg-red-100 text-red-700'
      : 'bg-zinc-100 text-zinc-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${cls}`}>
      {status ?? 'sin suscripción'}
    </span>
  );
}
