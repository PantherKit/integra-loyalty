'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getSalesRep,
  getKpisMerchantsByRep,
  listSalesReps,
  assignMerchantRep,
  type SalesRep,
  type SalesMerchantKpi,
} from '@/lib/api';

export default function RepDetailRoute() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-400">Cargando…</div>}>
      <RepDetailInner />
    </Suspense>
  );
}

function RepDetailInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repId = searchParams.get('id') ?? '';

  const [rep, setRep] = useState<SalesRep | null>(null);
  const [merchants, setMerchants] = useState<SalesMerchantKpi[]>([]);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<string | null>(null);

  useEffect(() => {
    if (!repId) {
      router.replace('/sales/admin');
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([getSalesRep(repId), getKpisMerchantsByRep(repId), listSalesReps()])
      .then(([repRes, mRes, repsRes]) => {
        if (!alive) return;
        setRep(repRes);
        setMerchants(mRes.merchants);
        setReps(repsRes.reps);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const err = e as { status?: number };
        if (err?.status === 404) router.replace('/sales/admin');
        else setError('Error cargando datos');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [repId, router]);

  async function reassign(merchantId: string, newRepId: string) {
    setReassigning(merchantId);
    try {
      await assignMerchantRep(merchantId, newRepId);
      const mRes = await getKpisMerchantsByRep(repId);
      setMerchants(mRes.merchants);
    } catch {
      setError('No se pudo reasignar el comercio');
    } finally {
      setReassigning(null);
    }
  }

  const totalMrr = merchants.reduce((s, m) => s + m.mrrMxn, 0);
  const totalCards = merchants.reduce((s, m) => s + m.cardsCount, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/sales/admin"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-[#4f7d2a]"
      >
        ← Volver al panel
      </Link>

      {loading && (
        <div className="space-y-4">
          <div className="h-16 bg-white border border-zinc-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-white border border-zinc-200 rounded-xl animate-pulse" />
        </div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {rep && !loading && (
        <>
          {/* Encabezado del vendedor */}
          <section className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center w-11 h-11 rounded-full bg-[#4f7d2a]/10 text-[#4f7d2a] font-semibold uppercase">
                {rep.email.slice(0, 2)}
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-zinc-900 truncate">{rep.email}</h1>
                <p className="text-sm text-zinc-500">
                  Vendedor desde {new Date(rep.createdAt).toLocaleDateString('es-MX')}
                  {rep.lastLoginAt && (
                    <> · último ingreso {new Date(rep.lastLoginAt).toLocaleDateString('es-MX')}</>
                  )}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <HeadStat label="Comercios" value={merchants.length} />
              <HeadStat label="Tarjetas" value={totalCards} />
              <HeadStat label="MRR (MXN)" value={`$${totalMrr.toLocaleString('es-MX')}`} accent />
            </div>
          </section>

          {/* Cartera */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">
              Cartera ({merchants.length})
            </h2>

            {merchants.length === 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center">
                <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-zinc-100 text-zinc-400 mb-3">
                  <StoreIcon />
                </div>
                <p className="text-sm font-medium text-zinc-700">Sin comercios todavía</p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Este vendedor aún no tiene comercios en su cartera.
                </p>
              </div>
            )}

            {/* Desktop: tabla */}
            {merchants.length > 0 && (
              <div className="hidden md:block bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Comercio</th>
                      <th className="text-left px-4 py-2.5 font-medium">Suscripción</th>
                      <th className="text-right px-4 py-2.5 font-medium">Tarjetas</th>
                      <th className="text-right px-4 py-2.5 font-medium">MRR</th>
                      <th className="text-left px-4 py-2.5 font-medium">Reasignar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merchants.map((m) => (
                      <tr key={m.merchantId} className="border-t border-zinc-100">
                        <td className="px-4 py-3 font-medium text-zinc-900">{m.name}</td>
                        <td className="px-4 py-3">
                          <SubscriptionBadge status={m.subscriptionStatus} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{m.cardsCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          ${m.mrrMxn.toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-3">
                          <ReassignSelect
                            merchantId={m.merchantId}
                            currentRepId={repId}
                            reps={reps}
                            disabled={reassigning === m.merchantId}
                            onChange={reassign}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Móvil: tarjetas */}
            <div className="md:hidden space-y-2">
              {merchants.map((m) => (
                <div key={m.merchantId} className="bg-white border border-zinc-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-zinc-900 truncate">{m.name}</span>
                    <SubscriptionBadge status={m.subscriptionStatus} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
                    <MiniStat label="Tarjetas" value={m.cardsCount} />
                    <MiniStat label="MRR" value={`$${m.mrrMxn.toLocaleString('es-MX')}`} />
                  </div>
                  <ReassignSelect
                    merchantId={m.merchantId}
                    currentRepId={repId}
                    reps={reps}
                    disabled={reassigning === m.merchantId}
                    onChange={reassign}
                    full
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function HeadStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${accent ? 'text-[#4f7d2a]' : 'text-zinc-900'}`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-sm font-semibold text-zinc-900 tabular-nums">{value}</div>
    </div>
  );
}

function ReassignSelect({
  merchantId,
  currentRepId,
  reps,
  disabled,
  onChange,
  full,
}: {
  merchantId: string;
  currentRepId: string;
  reps: SalesRep[];
  disabled: boolean;
  onChange: (merchantId: string, newRepId: string) => void;
  full?: boolean;
}) {
  return (
    <select
      disabled={disabled}
      defaultValue={currentRepId}
      onChange={(e) => onChange(merchantId, e.target.value)}
      className={`text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-700 disabled:opacity-50 ${
        full ? 'w-full' : ''
      }`}
    >
      {reps.map((r) => (
        <option key={r.userId} value={r.userId}>
          {r.email}
        </option>
      ))}
    </select>
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
      {status ?? '—'}
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
