'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Apple, Wallet, Phone, User as UserIcon } from 'lucide-react';
import { getPublicMerchant, signupCustomerToMerchant, type PublicMerchant } from '@/lib/api';
import ApplePassPreview from '@/components/ApplePassPreview';

function PublicMerchantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('s') ?? '';

  const [data, setData] = useState<PublicMerchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ phone: '+52', firstName: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) { setError('Falta el slug del comercio.'); setLoading(false); return; }
    getPublicMerchant(slug)
      .then(setData)
      .catch(() => setError('No encontramos este comercio.'))
      .finally(() => setLoading(false));
  }, [slug]);

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signupCustomerToMerchant(slug, form);
      router.push(`/wallet/?id=${result.card.cardId}&s=${encodeURIComponent(slug)}`);
    } catch (e: unknown) {
      const body = (e as { body?: { error?: string } })?.body;
      if (body?.error === 'no_active_program') setError('Este comercio aún no tiene un programa activo. Intenta más tarde.');
      else setError('Error al registrarte. Verifica tu teléfono y vuelve a intentar.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6 animate-pulse">
        <div className="h-[340px] rounded-[14px] bg-gray-200" />
        <div className="h-10 bg-gray-200 rounded-xl" />
        <div className="h-10 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
    );
  }
  if (!data) return null;

  const brandColor = data.merchant.brandColor ?? '#4f46e5';
  const stampsRequired = data.program?.stampsRequired ?? 8;
  const rewardDetail = data.program?.rewardDetail ?? 'Premio de lealtad';

  return (
    <div className="w-full max-w-md space-y-6">

      {/* Encabezado del comercio */}
      <div className="text-center space-y-1">
        {data.merchant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.merchant.logoUrl}
            alt={data.merchant.name}
            className="mx-auto h-14 w-14 rounded-2xl object-contain border border-gray-100 bg-white p-1"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-2xl mx-auto grid place-items-center text-white text-2xl font-bold"
            style={{ background: brandColor }}
          >
            {data.merchant.name.charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{data.merchant.name}</h1>
        <p className="text-xs text-gray-400 uppercase tracking-widest">{data.merchant.industry}</p>
      </div>

      {/* Preview de la tarjeta — el cliente ve lo que va a recibir */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-gray-400 text-center">
          Tu tarjeta en Apple Wallet
        </p>
        <div className="flex justify-center">
          <ApplePassPreview
            merchantName={data.merchant.name}
            bgColor={data.merchant.brandColor}
            logoUrl={data.merchant.logoUrl}
            stampStyle={data.merchant.stampStyle}
            stampsRequired={stampsRequired}
            rewardDetail={rewardDetail}
            stamps={0}
          />
        </div>
        <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Apple size={12} /> Apple Wallet</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Wallet size={12} /> Google Wallet</span>
        </div>
      </div>

      {/* Formulario de registro */}
      {data.program ? (
        <form onSubmit={onSignup} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Obtén tu tarjeta gratis</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Sin app, sin contraseña. Solo tu teléfono y listo.
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
              <Phone size={14} /> Teléfono
            </span>
            <input
              required
              type="tel"
              pattern="^\+\d{10,15}$"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+5219991234567"
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base outline-none focus:border-brand-500"
            />
            <span className="text-xs text-gray-400 mt-1 block">Formato internacional. Ej. +5219991234567</span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
              <UserIcon size={14} /> Nombre (opcional)
            </span>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Tu nombre"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base outline-none focus:border-brand-500"
            />
          </label>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-white rounded-xl px-4 py-3 font-medium disabled:opacity-50 text-sm"
            style={{ background: brandColor }}
          >
            {submitting ? 'Registrando…' : 'Obtener mi tarjeta →'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Al registrarte aceptas recibir comunicación de {data.merchant.name}.
          </p>
        </form>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          Este comercio aún no configuró un programa activo. Intenta más tarde.
        </div>
      )}
    </div>
  );
}

export default function PublicMerchantPage() {
  return (
    <main className="flex-1 grid place-items-center px-4 py-10 bg-gradient-to-b from-gray-50 to-gray-100">
      <Suspense fallback={
        <div className="w-full max-w-sm space-y-4 animate-pulse">
          <div className="h-[340px] rounded-[14px] bg-gray-200" />
          <div className="h-10 bg-gray-200 rounded-xl" />
        </div>
      }>
        <PublicMerchantContent />
      </Suspense>
    </main>
  );
}
