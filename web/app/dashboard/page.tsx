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
  TrendingUp,
  Zap,
} from 'lucide-react';
import LoyaltyPass from '@/components/LoyaltyPass';
import { useDashboard } from '@/components/dashboard-context';
import {
  RecommendationCard,
  type Recommendation as DashboardRecommendationCard,
} from '@/components/dashboard/RecommendationCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_STAMPS_REQUIRED } from '@/lib/constants';
import {
  getActivity,
  getDashboardRecommendations,
  listMyPrograms,
  type DashboardKpiExplanation,
  type DashboardKpiId,
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
  const [recommendations, setRecommendations] = useState<DashboardRecommendationCard[]>([]);
  const [kpiExplanations, setKpiExplanations] = useState<DashboardKpiExplanation[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

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

  // Fetch lazy de recomendaciones: post primer paint, no bloquea KPIs/feed.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setRecsLoading(true);
      getDashboardRecommendations()
        .then((res) => {
          if (cancelled) return;
          setRecommendations(res.recommendations ?? []);
          setKpiExplanations(res.kpi_explanations ?? []);
        })
        .catch(() => {
          if (cancelled) return;
          setRecommendations([]);
          setKpiExplanations([]);
        })
        .finally(() => {
          if (!cancelled) setRecsLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const kpiExplanationById: Partial<Record<DashboardKpiId, string>> = {};
  for (const k of kpiExplanations) kpiExplanationById[k.kpi_id] = k.text;

  const activeProgram = programs.find((p) => p.status === 'active') ?? programs[0] ?? null;
  const stampsGiven = activity
    .filter((t) => t.kind === 'stamp')
    .reduce((sum, t) => sum + t.amount, 0);
  const redemptions = activity.filter((t) => t.kind === 'redeem').length;
  const uniqueCustomers = new Set(
    activity.map((t) => t.customerPhone).filter(Boolean)
  ).size;
  const stampsRequired = activeProgram?.stampsRequired ?? DEFAULT_STAMPS_REQUIRED;
  const fillRatePct =
    uniqueCustomers > 0 && stampsRequired > 0
      ? Math.min(100, Math.round((stampsGiven / (uniqueCustomers * stampsRequired)) * 100))
      : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 space-y-4">
        {/* Encabezado */}
        <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Resumen
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Hola, {merchant?.name ?? 'comercio'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Actividad reciente y métricas del programa.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/share/">
                <Share2 size={15} /> Compartir
              </Link>
            </Button>
            <Button asChild variant="loyalty" size="sm">
              <Link href="/dashboard/give-stamp/">
                <ScanLine size={15} /> Dar sello
              </Link>
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Estado del programa */}
        {!loading && (
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
              activeProgram
                ? 'border border-success/20 bg-success/5 text-success'
                : 'border border-warning/20 bg-warning/5 text-warning'
            }`}
          >
            <Award size={16} />
            {activeProgram ? (
              <>
                <span>
                  Programa activo:{' '}
                  <span className="font-semibold">{activeProgram.name}</span>
                </span>
                <span className="ml-auto text-xs opacity-70">
                  Necesitas {activeProgram.stampsRequired} sellos · Premio: {activeProgram.rewardDetail}
                </span>
              </>
            ) : (
              <>
                <span>Sin programa activo</span>
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link href="/dashboard/programa/">Crear programa</Link>
                </Button>
              </>
            )}
          </div>
        )}
        {loading && <Skeleton className="h-12 rounded-xl" />}

        {/* KPIs prominentes 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={<Users size={16} />}
            label="Clientes activos"
            value={loading ? null : uniqueCustomers}
            hint="en actividad reciente"
            explanation={kpiExplanationById['clientes_activos']}
            loading={loading}
            accent={uniqueCustomers > 0}
          />
          <KpiCard
            icon={<Plus size={16} />}
            label="Sellos otorgados"
            value={loading ? null : stampsGiven}
            hint="últimas 20 operaciones"
            explanation={kpiExplanationById['sellos_otorgados']}
            loading={loading}
          />
          <KpiCard
            icon={<Gift size={16} />}
            label="Premios canjeados"
            value={loading ? null : redemptions}
            hint="recompensas entregadas"
            explanation={kpiExplanationById['premios_canjeados']}
            loading={loading}
            accent={redemptions > 0}
          />
          <KpiCard
            icon={<TrendingUp size={16} />}
            label="Progreso promedio"
            value={loading ? null : uniqueCustomers > 0 ? `${fillRatePct}%` : '—'}
            hint={
              uniqueCustomers > 0
                ? `de ${stampsRequired} sellos hacia el premio`
                : 'aún sin sellos'
            }
            loading={loading}
          />
        </div>

        {/* Recomendaciones IA (lazy) */}
        {recsLoading ? (
          <section aria-label="Recomendaciones para hoy" className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Recomendaciones para hoy
            </p>
            <Skeleton className="h-20" />
          </section>
        ) : recommendations.length > 0 ? (
          <section aria-label="Recomendaciones para hoy" className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Recomendaciones para hoy
            </p>
            <div className="space-y-2">
              {recommendations.map((r) => (
                <RecommendationCard key={r.id} recommendation={r} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Feed de actividad */}
        <Card className="min-h-[400px]">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b pb-3">
            <div>
              <CardTitle>Actividad</CardTitle>
              <CardDescription>Últimas operaciones registradas.</CardDescription>
            </div>
            <Button
              onClick={() => load(false)}
              disabled={refreshing || loading}
              variant="ghost"
              size="sm"
            >
              <RefreshCw
                size={12}
                className={refreshing ? 'animate-spin' : ''}
              />
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-4 text-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl border bg-muted text-muted-foreground">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Aún no hay movimientos
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Comparte tu QR para que tus clientes se registren, luego dales sellos desde aquí.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/share/">
                      <Share2 size={14} /> Compartir QR
                    </Link>
                  </Button>
                  <Button asChild variant="loyalty" size="sm">
                    <Link href="/dashboard/give-stamp/">
                      <ScanLine size={14} /> Dar sello
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="divide-y">
                {activity.map((t) => (
                  <li
                    key={t.transactionId}
                    className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
                  >
                    <div
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${
                        t.kind === 'redeem'
                          ? 'border-warning/20 bg-warning/5 text-warning'
                          : 'border-success/20 bg-success/5 text-success'
                      }`}
                    >
                      {t.kind === 'redeem' ? (
                        <Gift size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                    </div>
                    <div className="min-w-0 text-sm leading-tight">
                      {t.kind === 'stamp' ? (
                        <p className="truncate text-foreground">
                          +{t.amount} sello{t.amount > 1 ? 's' : ''} a{' '}
                          <span className="font-medium">{t.customerPhone}</span>
                        </p>
                      ) : (
                        <p className="truncate text-foreground">
                          Premio canjeado por{' '}
                          <span className="font-medium">{t.customerPhone}</span>
                        </p>
                      )}
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {t.programName} · {t.stampsBefore} → {t.stampsAfter} sellos
                      </p>
                    </div>
                    <Badge
                      variant={t.kind === 'redeem' ? 'warning' : 'success'}
                      className="font-mono"
                    >
                      {formatRelative(t.createdAt)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Columna lateral */}
      <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle>Acciones rápidas</CardTitle>
            <CardDescription>Para operar en mostrador.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 pt-3">
            <Button asChild variant="loyalty" className="justify-start">
              <Link href="/dashboard/give-stamp/">
                <ScanLine size={15} /> Dar sello o canjear
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dashboard/share/">
                <Share2 size={15} /> Compartir QR y enlace
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Tu tarjeta</CardTitle>
                <CardDescription>Así se ve en Apple Wallet.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/share/" aria-label="Compartir tarjeta">
                  <ArrowUpRight size={15} />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <LoyaltyPass
              variant="preview"
              merchantName={merchant?.name ?? 'Tu comercio'}
              brandColor={merchant?.brandColor ?? '#4361ee'}
              tagline={merchant?.industry}
              logoUrl={merchant?.logoUrl}
              stampStyle={merchant?.stampStyle}
              programName={activeProgram?.name ?? 'Programa de lealtad'}
              stampsRequired={activeProgram?.stampsRequired ?? DEFAULT_STAMPS_REQUIRED}
              rewardDetail={activeProgram?.rewardDetail ?? 'Tu recompensa aquí'}
              stamps={0}
              className="mx-auto max-w-[260px]"
            />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  hint,
  explanation,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number | null;
  hint: string;
  explanation?: string;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 space-y-2 ${
        accent
          ? 'border-success/20 bg-success/5'
          : 'border-border bg-background'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`${accent ? 'text-success' : 'text-muted-foreground'}`}>
          {icon}
        </span>
        <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums text-foreground">
        {loading ? <Skeleton className="h-8 w-12" /> : (value ?? '—')}
      </div>
      <p className="text-[11px] text-muted-foreground/80 truncate">{hint}</p>
      {explanation && (
        <p className="text-[11px] leading-snug text-muted-foreground border-t pt-1.5 mt-1">
          {explanation}
        </p>
      )}
    </div>
  );
}
