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

  return (
    <div className="space-y-6">
      <Link href="/sales/admin" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← Volver al panel
      </Link>

      {loading && <div className="text-sm text-zinc-400">Cargando…</div>}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      {rep && (
        <>
          <section>
            <h1 className="text-2xl font-bold text-zinc-900">{rep.email}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Vendedor desde {new Date(rep.createdAt).toLocaleDateString('es-MX')}
              {rep.lastLoginAt && (
                <> · último ingreso {new Date(rep.lastLoginAt).toLocaleDateString('es-MX')}</>
              )}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">
              Cartera ({merchants.length})
            </h2>
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Comercio</th>
                    <th className="text-left px-4 py-2 font-medium">Suscripción</th>
                    <th className="text-right px-4 py-2 font-medium">Tarjetas</th>
                    <th className="text-right px-4 py-2 font-medium">MRR</th>
                    <th className="text-left px-4 py-2 font-medium">Reasignar</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                        Este vendedor aún no tiene comercios en su cartera.
                      </td>
                    </tr>
                  )}
                  {merchants.map((m) => (
                    <tr key={m.merchantId} className="border-t border-zinc-100">
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3">
                        <SubscriptionBadge status={m.subscriptionStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">{m.cardsCount}</td>
                      <td className="px-4 py-3 text-right">
                        ${m.mrrMxn.toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={reassigning === m.merchantId}
                          defaultValue={repId}
                          onChange={(e) => reassign(m.merchantId, e.target.value)}
                          className="text-xs border border-zinc-200 rounded px-2 py-1 bg-white"
                        >
                          {reps.map((r) => (
                            <option key={r.userId} value={r.userId}>
                              {r.email}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
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
      {status ?? '—'}
    </span>
  );
}
