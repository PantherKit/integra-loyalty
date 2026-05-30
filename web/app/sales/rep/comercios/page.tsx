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

function activationSteps(m: SalesMerchantKpi) {
  return [
    {
      id: 'cuenta',
      label: 'Cuenta creada',
      done: true,
    },
    {
      id: 'programa',
      label: 'Programa configurado',
      done: m.subscriptionStatus === 'active' || m.subscriptionStatus === 'trialing' || m.cardsCount > 0,
    },
    {
      id: 'tarjeta',
      label: 'Primera tarjeta emitida',
      done: m.cardsCount > 0,
    },
    {
      id: 'sello',
      label: 'Primer sello dado',
      done: m.lastActivityAt != null,
    },
  ];
}

function nextAction(m: SalesMerchantKpi): string {
  if (!m.cardsCount) return 'El dueño necesita terminar su onboarding y compartir el QR con clientes.';
  if (!m.lastActivityAt) return 'Ya tiene clientes registrados. Recuérdale dar sellos desde su panel.';
  if (m.subscriptionStatus === 'past_due') return 'Suscripción vencida. Contacta al dueño para regularizar.';
  return 'Todo bien. Monitorea actividad y busca oportunidades de upsell.';
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
    if (!claims?.sub) { router.replace('/login'); return; }
    if (!merchantId) { router.replace('/sales/rep'); return; }
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
    return () => { alive = false; };
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
          <div className="h-32 bg-white border border-zinc-200 rounded-xl animate-pulse" />
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      {merchant && !loading && (
        <>
          {/* Encabezado */}
          <section className="bg-white border border-zinc-200 rounded-xl p-4 space-y-1.5">
            <h1 className="text-xl font-bold text-zinc-900">{merchant.name}</h1>
            <SubscriptionBadge status={merchant.subscriptionStatus} />
          </section>

          {/* KPIs */}
          <section className="grid grid-cols-2 gap-3">
            <KpiCard label="Tarjetas activas" value={merchant.cardsCount} />
            <KpiCard
              label="MRR"
              value={`$${merchant.mrrMxn.toLocaleString('es-MX')}`}
              sub="MXN / mes"
              accent
            />
          </section>

          {/* Progreso de activación */}
          <section className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-900">Progreso de activación</h2>
            <ol className="space-y-2.5">
              {activationSteps(merchant).map((s) => (
                <li key={s.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      s.done
                        ? 'bg-green-100 text-green-700'
                        : 'bg-zinc-100 text-zinc-400'
                    }`}
                  >
                    {s.done ? '✓' : '○'}
                  </span>
                  <span className={s.done ? 'text-zinc-900' : 'text-zinc-400'}>{s.label}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Próxima acción recomendada */}
          <section className="bg-[#4f7d2a]/5 border border-[#4f7d2a]/20 rounded-xl p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-[#4f7d2a] font-semibold">Próxima acción</p>
            <p className="text-sm text-zinc-700">{nextAction(merchant)}</p>
          </section>

          {/* Info adicional */}
          <section className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 text-sm">
            <Row
              label="Última actividad"
              value={
                merchant.lastActivityAt
                  ? new Date(merchant.lastActivityAt).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                  : '—'
              }
            />
            <Row label="Estado" value={merchant.status} />
          </section>

          <p className="text-xs text-zinc-400 text-center pt-1 px-4">
            Para emitir sellos o gestionar el programa, el dueño entra con sus credenciales.
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
      <div className={`text-[10px] uppercase tracking-wide ${accent ? 'text-white/80' : 'text-zinc-500'}`}>
        {label}
      </div>
      <div className={`text-xl font-semibold mt-1 tabular-nums ${accent ? 'text-white' : 'text-zinc-900'}`}>
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
