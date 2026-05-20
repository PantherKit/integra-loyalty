'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Award, Share2 } from 'lucide-react';
import { useDashboard } from '@/components/dashboard-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  createProgram,
  listMyPrograms,
  isSubscriptionRequired,
  type LoyaltyProgram,
} from '@/lib/api';

const REWARD_TYPES = [
  { value: 'free_item', label: 'Item gratis' },
  { value: 'discount_percent', label: 'Descuento %' },
  { value: 'discount_amount', label: 'Descuento $ fijo' },
  { value: 'custom', label: 'Otro' },
] as const;

export default function ProgramsPage() {
  const { merchant } = useDashboard();
  const [items, setItems] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    stampsRequired: 7,
    rewardType: 'free_item' as LoyaltyProgram['rewardType'],
    rewardDetail: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [paywalled, setPaywalled] = useState(false);

  useEffect(() => {
    listMyPrograms()
      .then((r) => {
        setItems(r.items);
        setLoadError(null);
      })
      .catch(() =>
        setLoadError('No pudimos cargar tus programas. Reintenta más tarde.')
      )
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    setPaywalled(false);
    setSubmitting(true);
    try {
      const created = await createProgram(form);
      setItems((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({
        name: '',
        description: '',
        stampsRequired: 7,
        rewardType: 'free_item',
        rewardDetail: '',
      });
      setNotice('Programa creado. Ya puedes compartirlo con tus clientes.');
    } catch (e) {
      if (isSubscriptionRequired(e)) {
        setPaywalled(true);
        setFormError(
          'Tu prueba terminó o tu suscripción no está activa. Suscríbete para crear programas.'
        );
      } else {
        setFormError('No se pudo crear el programa. Revisa los campos.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Programa
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
            Programas de lealtad
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define cuántos sellos necesita un cliente y qué premio recibe.
          </p>
        </div>
        <Button
          onClick={() => setShowForm((s) => !s)}
          variant="loyalty"
          size="sm"
        >
          <Plus size={15} /> Nuevo programa
        </Button>
      </header>

      {merchant && (
        <Alert variant="loyalty" className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Comparte tu programa con tus clientes
            </p>
            <p className="text-xs text-muted-foreground">
              Tu enlace público:{' '}
              <code className="rounded-lg bg-background px-1.5 py-0.5 font-mono">/c/?s={merchant.slug}</code>
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/share/">
              <Share2 size={15} /> Ver QR y enlace
            </Link>
          </Button>
        </Alert>
      )}

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert variant="success">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <form
          onSubmit={onCreate}
          className="rounded-2xl border bg-card p-4 text-card-foreground"
        >
          <h2 className="mb-3 font-semibold text-foreground">Crear programa</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="program-name">Nombre</Label>
              <Input
                id="program-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='ej. "Café gratis"'
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="stamps-required">Sellos requeridos</Label>
              <Input
                id="stamps-required"
                required
                type="number"
                min={1}
                max={50}
                value={form.stampsRequired}
                onChange={(e) =>
                  setForm({
                    ...form,
                    stampsRequired: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="reward-type">Tipo de premio</Label>
              <select
                id="reward-type"
                value={form.rewardType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rewardType: e.target
                      .value as LoyaltyProgram['rewardType'],
                  })
                }
                className="mt-1 flex min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {REWARD_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="reward-detail">Premio</Label>
              <Input
                id="reward-detail"
                required
                value={form.rewardDetail}
                onChange={(e) =>
                  setForm({ ...form, rewardDetail: e.target.value })
                }
                placeholder='ej. "Café americano gratis"'
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="program-description">Descripción opcional</Label>
              <Textarea
                id="program-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          {formError && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription className="space-y-2">
              <p>{formError}</p>
              {paywalled && (
                <Button asChild size="sm" variant="destructive">
                  <Link href="/dashboard/suscribirse/">
                    Ver planes y suscribirme
                  </Link>
                </Button>
              )}
              </AlertDescription>
            </Alert>
          )}
          <div className="mt-4 flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => setShowForm(false)}
              variant="ghost"
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              variant="loyalty"
              className="w-full sm:w-auto"
            >
              {submitting ? 'Creando…' : 'Crear programa'}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl border bg-background text-muted-foreground">
            <Award size={20} />
          </div>
          <h3 className="mb-1 font-semibold text-foreground">
            Aún no tienes programas
          </h3>
          <p className="text-sm text-muted-foreground">
            Crea tu primer programa de lealtad para empezar a registrar
            clientes.
          </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="overflow-hidden rounded-2xl border bg-card">
          {items.map((p) => (
            <li key={p.programId} className="border-b last:border-b-0">
              <div className="flex items-center gap-3 p-3">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border bg-background text-muted-foreground">
                  <Award size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.stampsRequired} sellos · {p.rewardDetail}
                  </div>
                </div>
                <Badge
                  variant={p.status === 'active' ? 'success' : 'secondary'}
                  className="shrink-0"
                >
                  {p.status === 'active'
                    ? 'Activo'
                    : p.status === 'paused'
                      ? 'Pausado'
                      : 'Archivado'}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
