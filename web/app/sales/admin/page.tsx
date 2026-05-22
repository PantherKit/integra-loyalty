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

const GREEN = '#4f7d2a';

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
        setError(e instanceof Error ? e.message : 'Error cargando KPIs');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [window]);

  return (
    <div className="space-y-8">
      {/* KPIs personales */}
      <section>
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Mi fuerza de ventas</h1>
        {loading && <KpiCardsSkeleton />}
        {error && <ErrorBlock text={error} />}
        {me && !loading && !error && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard label="Vendedores" value={me.repsCount} icon="users" />
            <KpiCard label="Comercios" value={me.merchantsCount} icon="store" />
            <KpiCard label="Tarjetas emitidas" value={me.cardsIssuedCount} icon="card" />
            <KpiCard
              label="MRR atribuible"
              value={`$${me.mrrMxn.toLocaleString('es-MX')}`}
              hint="MXN / mes"
              accent
              icon="money"
            />
          </div>
        )}
      </section>

      {/* Tabla de vendedores */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-zinc-900">Desglose por vendedor</h2>
          <WindowSelect value={window} onChange={setWindow} />
        </div>

        {/* Desktop: tabla */}
        <div className="hidden md:block bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Vendedor</th>
                <th className="text-right px-4 py-2.5 font-medium">Comercios</th>
                <th className="text-right px-4 py-2.5 font-medium">Tarjetas</th>
                <th className="text-right px-4 py-2.5 font-medium">MRR (MXN)</th>
                <th className="text-right px-4 py-2.5 font-medium">Churn risk</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loading && reps.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="px-4 py-12">
                    <EmptyReps />
                  </td>
                </tr>
              )}
              {!loading &&
                reps.map((r) => (
                  <tr key={r.repId} className="border-t border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/sales/admin/reps?id=${encodeURIComponent(r.repId)}`}
                        className="font-medium text-zinc-900 hover:text-[#4f7d2a] hover:underline"
                      >
                        {r.repEmail}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.merchantsCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.cardsIssuedCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ${r.mrrMxn.toLocaleString('es-MX')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChurnBadge count={r.churnRiskCount} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Móvil: tarjetas */}
        <div className="md:hidden space-y-2">
          {loading && (
            <>
              <div className="h-24 bg-white border border-zinc-200 rounded-xl animate-pulse" />
              <div className="h-24 bg-white border border-zinc-200 rounded-xl animate-pulse" />
            </>
          )}
          {!loading && reps.length === 0 && !error && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6">
              <EmptyReps />
            </div>
          )}
          {!loading &&
            reps.map((r) => (
              <Link
                key={r.repId}
                href={`/sales/admin/reps?id=${encodeURIComponent(r.repId)}`}
                className="block bg-white border border-zinc-200 rounded-xl p-4 active:bg-zinc-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-900 truncate">{r.repEmail}</span>
                  <ChurnBadge count={r.churnRiskCount} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <MiniStat label="Comercios" value={r.merchantsCount} />
                  <MiniStat label="Tarjetas" value={r.cardsIssuedCount} />
                  <MiniStat label="MRR" value={`$${r.mrrMxn.toLocaleString('es-MX')}`} />
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
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  icon: IconName;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        accent ? 'bg-[#4f7d2a] border-[#4f7d2a] text-white' : 'bg-white border-zinc-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={accent ? 'text-white/80' : 'text-[#4f7d2a]'}>
          <Icon name={icon} />
        </span>
        <span
          className={`text-xs uppercase tracking-wide ${
            accent ? 'text-white/80' : 'text-zinc-500'
          }`}
        >
          {label}
        </span>
      </div>
      <div className="text-2xl font-semibold mt-2 tabular-nums">{value}</div>
      {hint && (
        <div className={`text-[11px] ${accent ? 'text-white/70' : 'text-zinc-400'}`}>{hint}</div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-sm font-semibold text-zinc-900 tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
    </div>
  );
}

function ChurnBadge({ count }: { count: number }) {
  if (count > 0) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-medium">
        {count} en riesgo
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-xs font-medium">
      Sano
    </span>
  );
}

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 bg-white h-24 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyReps() {
  return (
    <div className="text-center">
      <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-zinc-100 text-zinc-400 mb-3">
        <Icon name="users" />
      </div>
      <p className="text-sm font-medium text-zinc-700">Aún no tienes vendedores</p>
      <p className="text-sm text-zinc-400 mt-0.5 mb-4">
        Da de alta tu primer vendedor para empezar a ver resultados.
      </p>
      <Link
        href="/sales/admin/reps/new"
        className="inline-block bg-[#4f7d2a] hover:bg-[#3d6520] text-white text-sm font-medium px-4 py-2 rounded-lg"
      >
        Alta de vendedor
      </Link>
    </div>
  );
}

function ErrorBlock({ text }: { text: string }) {
  return (
    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
      {text}
    </div>
  );
}

function WindowSelect({
  value,
  onChange,
}: {
  value: KpiWindow;
  onChange: (v: KpiWindow) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as KpiWindow)}
      className="text-sm border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-700"
    >
      <option value="7d">Últimos 7 días</option>
      <option value="30d">Últimos 30 días</option>
      <option value="90d">Últimos 90 días</option>
      <option value="all">Todo el tiempo</option>
    </select>
  );
}

type IconName = 'users' | 'store' | 'card' | 'money';

function Icon({ name }: { name: IconName }) {
  const common = 'w-4 h-4';
  if (name === 'users')
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z" />
      </svg>
    );
  if (name === 'store')
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l1-5h16l1 5M4 9v11h16V9M4 9h16" />
      </svg>
    );
  if (name === 'card')
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 7h18v10H3zM7 15h4" />
      </svg>
    );
  return (
    <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-3-5h6m-9 7h12V6H6z" />
    </svg>
  );
}
