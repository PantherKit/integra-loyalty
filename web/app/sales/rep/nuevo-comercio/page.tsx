'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSalesMerchant, apiErrorMessage } from '@/lib/api';

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
      setError(apiErrorMessage(e, 'No se pudo registrar el comercio'));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="text-center pt-2">
          <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-green-100 text-green-700 mb-2">
            <CheckIcon />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Comercio registrado</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Comparte estas credenciales con el dueño por un canal seguro.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <div className="flex flex-col gap-0.5 px-4 py-2.5 border-b border-zinc-100">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Email del dueño
            </span>
            <span className="text-sm font-mono text-zinc-900 select-all break-all">
              {created.ownerEmail}
            </span>
          </div>
          <div className="flex flex-col gap-1 px-4 py-3 bg-[#4f7d2a]/5">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Contraseña temporal
            </span>
            <span className="font-mono text-lg font-semibold text-[#3d6520] select-all">
              {created.tempPassword}
            </span>
          </div>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-zinc-400">
          <span aria-hidden>🔒</span>
          <span>La contraseña solo se muestra una vez.</span>
        </p>

        <div className="space-y-2 pt-1">
          <button
            onClick={() =>
              router.push(`/sales/rep/comercios?id=${encodeURIComponent(created.merchantId)}`)
            }
            className="w-full bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-3 rounded-lg text-sm font-medium min-h-[44px]"
          >
            Ver comercio
          </button>
          <button
            onClick={() => router.push('/sales/rep')}
            className="w-full border border-zinc-300 text-zinc-700 px-4 py-3 rounded-lg text-sm min-h-[44px]"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nuevo comercio</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Quedará asignado a tu cartera automáticamente.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre del comercio">
          <input
            type="text"
            required
            minLength={2}
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-3 text-base min-h-[48px] focus:border-[#4f7d2a] focus:outline-none"
            placeholder="Abarrotes Coyote"
          />
        </Field>

        <Field label="Giro">
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-3 text-base min-h-[48px] bg-white focus:border-[#4f7d2a] focus:outline-none"
          >
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Email del dueño">
          <input
            type="email"
            required
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-3 text-base min-h-[48px] focus:border-[#4f7d2a] focus:outline-none"
            placeholder="dueno@abarrotescoyote.mx"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
          />
        </Field>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !merchantName || !ownerEmail}
          className="w-full bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-3 rounded-lg text-sm font-medium min-h-[48px] disabled:opacity-50"
        >
          {submitting ? 'Registrando…' : 'Registrar comercio'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function CheckIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
