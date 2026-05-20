'use client';

import { useEffect, useState } from 'react';
import { Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  startCheckout,
  getBillingStatus,
  type BillingPlan,
  type BillingStatus,
} from '@/lib/api';

interface PlanCard {
  plan: BillingPlan;
  name: string;
  price: string;
  tagline: string;
  feats: string[];
  hot: boolean;
}

const PLANS: PlanCard[] = [
  {
    plan: 'basico',
    name: 'Básico',
    price: '$349',
    tagline: '1 sucursal',
    feats: [
      '1 tarjeta de lealtad',
      'Apple + Google Wallet',
      '~1,000 clientes',
      'Push ilimitado',
      'QR de alta',
      'Panel básico',
    ],
    hot: false,
  },
  {
    plan: 'pro',
    name: 'Pro',
    price: '$649',
    tagline: 'El más elegido',
    feats: [
      'Todo lo de Básico',
      'Clientes ilimitados',
      'Campañas y cumpleaños',
      'Onboarding por WhatsApp',
      'Geo-notificaciones',
      'Hasta 3 usuarios',
    ],
    hot: true,
  },
  {
    plan: 'multi',
    name: 'Multi-sucursal',
    price: '$1,190',
    tagline: 'Cadenas y franquicias',
    feats: [
      'Todo lo de Pro',
      '3 sucursales incluidas',
      'Base de clientes unificada',
      'Reportes por sucursal',
      'Roles y permisos',
      'Soporte prioritario',
    ],
    hot: false,
  },
];

export default function SubscribePage() {
  const [busy, setBusy] = useState<BillingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returned, setReturned] = useState<'success' | 'cancel' | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('checkout');
    if (q === 'success' || q === 'cancel') setReturned(q);
    getBillingStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);

  async function onSubscribe(plan: BillingPlan) {
    setBusy(plan);
    setError(null);
    try {
      await startCheckout(plan); // redirige a Stripe Checkout
    } catch (e) {
      const body = (e as { status?: number; body?: { error?: string } })?.body;
      if (body?.error === 'billing_not_configured') {
        setError(
          'El cobro aún no está configurado. Escríbenos y lo activamos enseguida.'
        );
      } else {
        setError('No pudimos iniciar el pago. Intenta de nuevo en un momento.');
      }
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Suscripción
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
          Elige tu plan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sin contrato, cancela cuando quieras. Precios en pesos mexicanos
          (MXN), por mes.
        </p>
      </header>

      {returned === 'success' && (
        <Alert variant="success">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <AlertDescription>
            ¡Listo! Tu suscripción se está activando. Puede tardar unos segundos
            en reflejarse.
          </AlertDescription>
        </Alert>
      )}
      {returned === 'cancel' && (
        <Alert variant="warning">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <AlertDescription>Cancelaste el pago. Puedes intentarlo cuando quieras.</AlertDescription>
        </Alert>
      )}

      {status?.active && status.subscriptionStatus === 'active' && (
        <Alert variant="loyalty">
          <AlertDescription>
            Tu suscripción está activa
            {status.plan ? ` (plan ${status.plan})` : ''}.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-3 md:grid-cols-3">
        {PLANS.map((p) => (
          <Card
            key={p.plan}
            className={`relative ${
              p.hot
                ? 'border-brand-500 ring-1 ring-brand-500/40'
                : ''
            }`}
          >
            {p.hot && (
              <Badge variant="loyalty" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-primary-foreground">
                Más elegido
              </Badge>
            )}
            <CardHeader className="p-4 pb-0">
            <p className="text-sm font-semibold text-muted-foreground">{p.name}</p>
            <p className="mb-4 text-xs text-muted-foreground/70">{p.tagline}</p>
            <p className="font-mono text-4xl font-semibold">
              {p.price}
              <span className="font-sans text-base font-normal text-muted-foreground">
                {' '}
                MXN/mes
              </span>
            </p>
            </CardHeader>
            <CardContent className="p-4 pt-4">
            <ul className="mt-5 space-y-2">
              {p.feats.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Check
                    size={16}
                    className="mt-0.5 shrink-0 text-brand-600"
                  />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => onSubscribe(p.plan)}
              disabled={busy !== null}
              variant={p.hot ? 'loyalty' : 'outline'}
              className={`mt-6 w-full ${
                p.hot
                  ? ''
                  : ''
              }`}
            >
              {busy === p.plan ? 'Redirigiendo…' : 'Suscribirme'}
            </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
