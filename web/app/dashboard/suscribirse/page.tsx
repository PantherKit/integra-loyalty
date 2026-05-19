'use client';

import { useEffect, useState } from 'react';
import { Check, AlertCircle, CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Suscripción
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">
          Elige tu plan
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Sin contrato, cancela cuando quieras. Precios en pesos mexicanos
          (MXN), por mes.
        </p>
      </header>

      {returned === 'success' && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>
            ¡Listo! Tu suscripción se está activando. Puede tardar unos segundos
            en reflejarse.
          </span>
        </div>
      )}
      {returned === 'cancel' && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>Cancelaste el pago. Puedes intentarlo cuando quieras.</span>
        </div>
      )}

      {status?.active && status.subscriptionStatus === 'active' && (
        <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Tu suscripción está activa
          {status.plan ? ` (plan ${status.plan})` : ''}.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3 items-start">
        {PLANS.map((p) => (
          <div
            key={p.plan}
            className={`relative rounded-2xl border bg-white p-7 ${
              p.hot
                ? 'border-brand-600 shadow-xl shadow-brand-600/10'
                : 'border-gray-200'
            }`}
          >
            {p.hot && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                Más elegido
              </span>
            )}
            <p className="text-sm font-semibold text-gray-500">{p.name}</p>
            <p className="mb-4 text-xs text-gray-400">{p.tagline}</p>
            <p className="text-4xl font-semibold">
              {p.price}
              <span className="text-base font-normal text-gray-400">
                {' '}
                MXN/mes
              </span>
            </p>
            <ul className="mt-5 space-y-2">
              {p.feats.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <Check
                    size={16}
                    className="mt-0.5 shrink-0 text-brand-600"
                  />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => onSubscribe(p.plan)}
              disabled={busy !== null}
              className={`mt-6 block w-full rounded-xl px-4 py-3 text-center font-medium disabled:opacity-50 ${
                p.hot
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'border border-gray-300 text-gray-800 hover:bg-gray-50'
              }`}
            >
              {busy === p.plan ? 'Redirigiendo…' : 'Suscribirme'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
