'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getKpisMe,
  getKpisReps,
  type SalesAdminKpi,
  type SalesRepKpi,
  type KpiWindow,
} from '@/lib/api';

export default function SalesAdminHome() {
  const [me, setMe] = useState<SalesAdminKpi | null>(null);
  const [reps, setReps] = useState<SalesRepKpi[]>([]);
  const [window, setWindow] = useState<KpiWindow>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([getKpisMe(), getKpisReps({ window })])
      .then(([meRes, repsRes]) => {
        if (!alive) return;
        setMe(meRes as SalesAdminKpi);
        setReps(repsRes.reps);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : 'Error cargando KPIs';
        setError(msg);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [window]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Mi fuerza de ventas</h1>
        {loading && <KpiCardsSkeleton />}
        {error && <ErrorBlock text={error} />}
        {me && !loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Vendedores" value={me.repsCount} />
            <KpiCard label="Comercios" value={me.merchantsCount} />
            <KpiCard label="Tarjetas emitidas" value={me.cardsIssuedCount} />
            <KpiCard label="MRR atribuible" value={`$${me.mrrMxn.toLocaleString('es-MX')} MXN`} />
          </div>
        )}
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-lg font-semibold text-zinc-900">Desglose por vendedor</h2>
          <WindowSelect value={window} onChange={setWindow} />
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Vendedor</th>
                <th className="text-right px-4 py-2 font-medium">Comercios</th>
                <th className="text-right px-4 py-2 font-medium">Tarjetas</th>
                <th className="text-right px-4 py-2 font-medium">MRR (MXN)</th>
                <th className="text-right px-4 py-2 font-medium">Churn risk</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loading && reps.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    Aún no has reclutado vendedores.{' '}
                    <Link href="/sales/admin/reps/new" className="text-zinc-900 underline">
                      Dar de alta uno
                    </Link>
                    .
                  </td>
                </tr>
              )}
              {!loading &&
                reps.map((r) => (
                  <tr key={r.repId} className="border-t border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/sales/admin/reps?id=${encodeURIComponent(r.repId)}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {r.repEmail}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{r.merchantsCount}</td>
                    <td className="px-4 py-3 text-right">{r.cardsIssuedCount}</td>
                    <td className="px-4 py-3 text-right">
                      ${r.mrrMxn.toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.churnRiskCount > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">
                          {r.churnRiskCount}
                        </span>
                      ) : (
                        <span className="text-zinc-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold text-zinc-900 mt-1">{value}</div>
    </div>
  );
}

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border border-zinc-200 rounded-lg p-4 h-20 animate-pulse" />
      ))}
    </div>
  );
}

function ErrorBlock({ text }: { text: string }) {
  return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{text}</div>;
}

function WindowSelect({ value, onChange }: { value: KpiWindow; onChange: (v: KpiWindow) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as KpiWindow)}
      className="text-sm border border-zinc-200 rounded px-2 py-1 bg-white"
    >
      <option value="7d">Últimos 7 días</option>
      <option value="30d">Últimos 30 días</option>
      <option value="90d">Últimos 90 días</option>
      <option value="all">Todo el tiempo</option>
    </select>
  );
}
