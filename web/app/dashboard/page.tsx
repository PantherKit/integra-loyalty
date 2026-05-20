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
} from 'lucide-react';
import LoyaltyPass from '@/components/LoyaltyPass';
import { useDashboard } from '@/components/dashboard-context';
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
  listMyPrograms,
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

  const activeProgram = programs.find((p) => p.status === 'active') ?? programs[0] ?? null;
  const stampsGiven = activity
    .filter((t) => t.kind === 'stamp')
    .reduce((sum, t) => sum + t.amount, 0);
  const redemptions = activity.filter((t) => t.kind === 'redeem').length;
  const uniqueCustomers = new Set(
    activity.map((t) => t.customerPhone).filter(Boolean)
  ).size;

  const KPIS = [
    {
      label: 'Clientes activos',
      value: String(uniqueCustomers),
      hint: 'en actividad reciente',
      icon: Users,
    },
    {
      label: 'Sellos otorgados',
      value: String(stampsGiven),
      hint: 'últimas 20 operaciones',
      icon: Plus,
    },
    {
      label: 'Premios canjeados',
      value: String(redemptions),
      hint: 'recompensas entregadas',
      icon: Gift,
    },
    {
      label: 'Programa activo',
      value: activeProgram ? '1' : '0',
      hint: activeProgram ? activeProgram.name : 'crea tu programa',
      icon: Award,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 space-y-4">
        <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Resumen
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Hola, {merchant?.name ?? 'comercio'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Operación del programa, actividad reciente y accesos de mostrador.
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

        <Card className="min-h-[560px]">
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
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center px-4 text-center">
                <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl border bg-muted text-muted-foreground">
                  <ScanLine size={16} />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Aún no hay movimientos
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Cuando registres un sello o un canje, aparecerá en esta lista.
                </p>
                <Button asChild variant="loyalty" size="sm" className="mt-4">
                  <Link href="/dashboard/give-stamp/">
                    <ScanLine size={15} /> Dar primer sello
                  </Link>
                </Button>
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
            <CardTitle>Indicadores</CardTitle>
            <CardDescription>Actividad reciente del programa.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y">
              {KPIS.map((k) => (
                <div key={k.label} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <dt className="truncate text-xs font-medium text-muted-foreground">
                      {k.label}
                    </dt>
                    <dd className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                      {k.hint}
                    </dd>
                  </div>
                  <dd className="font-mono text-lg font-semibold tabular-nums text-foreground">
                    {loading ? '—' : k.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Tarjeta</CardTitle>
                <CardDescription>Preview para clientes.</CardDescription>
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
