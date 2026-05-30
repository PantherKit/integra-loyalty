'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { createSalesMerchant, apiErrorMessage } from '@/lib/api';

const INDUSTRIES = [
  { value: 'cafe', label: 'Cafetería' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'salon', label: 'Estética / Salón' },
  { value: 'retail', label: 'Comercio / Retail' },
  { value: 'other', label: 'Otro' },
];

type Created = { merchantId: string; ownerEmail: string; tempPassword: string };

export default function NewMerchantPage() {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState('');
  const [industry, setIndustry] = useState('cafe');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

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

  function copyPass(pass: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pass).then(() => {
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 1500);
      }).catch(() => {});
    }
  }

  if (created) {
    const onboardingUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/onboarding`
      : '/onboarding';

    return (
      <div className="space-y-5">
        {/* Éxito */}
        <div className="text-center pt-2">
          <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-green-100 text-green-700 mb-2">
            <CheckCircleIcon />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Comercio registrado</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Entrega las credenciales al dueño para que termine de configurar su tarjeta.
          </p>
        </div>

        {/* Credenciales */}
        <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
          <div className="flex flex-col gap-0.5 px-4 py-2.5 border-b border-zinc-100">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">Email del dueño</span>
            <span className="text-sm font-mono text-zinc-900 select-all break-all">{created.ownerEmail}</span>
          </div>
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#4f7d2a]/5">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-zinc-500">Contraseña temporal</span>
              <span className="font-mono text-lg font-semibold text-[#3d6520] select-all">{created.tempPassword}</span>
            </div>
            <button
              onClick={() => copyPass(created.tempPassword)}
              className="flex items-center gap-1.5 text-xs text-[#4f7d2a] font-medium border border-[#4f7d2a]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#4f7d2a]/10"
            >
              {copiedPass ? <Check size={13} /> : <Copy size={13} />}
              {copiedPass ? 'Copiada' : 'Copiar'}
            </button>
          </div>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-zinc-400">
          <span aria-hidden>🔒</span>
          <span>La contraseña solo se muestra una vez. El dueño la cambiará en su primer acceso.</span>
        </p>

        {/* Pasos siguientes */}
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-900">¿Qué sigue?</p>
          <ol className="space-y-2.5 text-sm text-zinc-600">
            <li className="flex items-start gap-2.5">
              <Step n={1} />
              <span>Manda el email y contraseña al dueño por un canal seguro (WhatsApp, mensaje directo).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Step n={2} />
              <span>
                El dueño entra a{' '}
                <a
                  href={onboardingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4f7d2a] underline"
                >
                  {onboardingUrl.replace('https://', '')}
                </a>{' '}
                con esas credenciales y configura su tarjeta en ~10 min.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Step n={3} />
              <span>Cuando tenga su tarjeta lista, recomiéndale poner el QR en mostrador y mandarlo por WhatsApp.</span>
            </li>
          </ol>
        </div>

        {/* Acciones */}
        <div className="space-y-2 pt-1">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Hola, aquí están tus accesos para Integra Loyalty:\n\nEmail: ${created.ownerEmail}\nContraseña temporal: ${created.tempPassword}\n\nEntra a ${onboardingUrl} para configurar tu tarjeta de lealtad.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-3 rounded-lg text-sm font-medium min-h-[44px]"
          >
            <WhatsAppIcon /> Compartir por WhatsApp
          </a>
          <button
            onClick={() => router.push(`/sales/rep/comercios?id=${encodeURIComponent(created.merchantId)}`)}
            className="w-full border border-zinc-300 text-zinc-700 px-4 py-3 rounded-lg text-sm min-h-[44px] flex items-center justify-center gap-2 hover:border-zinc-400"
          >
            <ExternalLink size={15} /> Ver comercio en mi cartera
          </button>
          <button
            onClick={() => router.push('/sales/rep')}
            className="w-full text-zinc-500 px-4 py-2.5 text-sm min-h-[40px]"
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
          Crea la cuenta del dueño. Él termina el diseño de su tarjeta en ~10 min.
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
              <option key={i.value} value={i.value}>{i.label}</option>
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
          <p className="text-xs text-zinc-400 mt-1">
            Se usará para generar sus credenciales de acceso.
          </p>
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

function Step({ n }: { n: number }) {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-zinc-200 text-zinc-600 text-xs font-semibold mt-0.5">
      {n}
    </span>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
