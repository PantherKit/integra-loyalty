'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSalesMerchant } from '@/lib/api';

const INDUSTRIES = [
  { value: 'cafe', label: 'Cafetería' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'salon', label: 'Estética / Salón' },
  { value: 'retail', label: 'Comercio / Retail' },
  { value: 'other', label: 'Otro' },
];

export default function NewMerchantPage() {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState('');
  const [industry, setIndustry] = useState('cafe');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    merchantId: string;
    ownerEmail: string;
    tempPassword: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await createSalesMerchant({ merchantName, industry, ownerEmail });
      setCreated({
        merchantId: res.tenant.tenantId,
        ownerEmail: res.owner.email,
        tempPassword: res.tempPassword,
      });
    } catch (e: unknown) {
      const err = e as { body?: { error?: string } };
      setError(err?.body?.error ?? 'No se pudo registrar el comercio');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-zinc-900">Comercio registrado</h1>
        <p className="text-sm text-zinc-600">
          Comparte estas credenciales con el dueño del comercio por canal seguro. La contraseña temporal solo se muestra una vez.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm space-y-2">
          <div>
            <span className="text-zinc-500">Email del dueño:</span>{' '}
            <span className="font-mono">{created.ownerEmail}</span>
          </div>
          <div>
            <span className="text-zinc-500">Contraseña temporal:</span>{' '}
            <span className="font-mono select-all">{created.tempPassword}</span>
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={() =>
              router.push(`/sales/rep/comercios?id=${encodeURIComponent(created.merchantId)}`)
            }
            className="w-full bg-zinc-900 text-white px-4 py-3 rounded text-sm font-medium min-h-[44px]"
          >
            Ver comercio
          </button>
          <button
            onClick={() => router.push('/sales/rep')}
            className="w-full text-zinc-600 px-4 py-3 text-sm min-h-[44px]"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold text-zinc-900">Nuevo comercio</h1>
      <p className="text-sm text-zinc-600">
        Crea la cuenta del comercio. Quedará asignado a tu cartera automáticamente.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Nombre del comercio</span>
          <input
            type="text"
            required
            minLength={2}
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            className="mt-1 w-full border border-zinc-200 rounded px-3 py-3 text-base min-h-[44px]"
            placeholder="Abarrotes Coyote"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Giro</span>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 w-full border border-zinc-200 rounded px-3 py-3 text-base min-h-[44px] bg-white"
          >
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Email del dueño</span>
          <input
            type="email"
            required
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className="mt-1 w-full border border-zinc-200 rounded px-3 py-3 text-base min-h-[44px]"
            placeholder="dueno@abarrotescoyote.mx"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
          />
        </label>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !merchantName || !ownerEmail}
          className="w-full bg-zinc-900 text-white px-4 py-3 rounded text-sm font-medium min-h-[44px] disabled:opacity-50"
        >
          {submitting ? 'Registrando…' : 'Registrar comercio'}
        </button>
      </form>
    </div>
  );
}
