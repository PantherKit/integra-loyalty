'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Award, Phone, User as UserIcon } from 'lucide-react';
import { getPublicMerchant, signupCustomerToMerchant, type PublicMerchant } from '@/lib/api';

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
    } catch (e: any) {
      const body = e?.body as { error?: string };
      if (body?.error === 'no_active_program') setError('Este comercio aún no tiene un programa activo. Intenta más tarde.');
      else setError('Error al registrarte. Verifica tu teléfono y vuelve a intentar.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-gray-500">Cargando…</div>;
  if (error && !data) return <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error}</div>;
  if (!data) return null;

  const brandColor = data.merchant.brandColor ?? '#4f46e5';

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 grid place-items-center text-white text-2xl font-bold" style={{ background: brandColor }}>
          {data.merchant.name.charAt(0)}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">{data.merchant.name}</h1>
        <p className="text-sm text-gray-500 uppercase tracking-wide">{data.merchant.industry}</p>
      </div>

      {data.program ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Award size={18} /></div>
            <div>
              <h2 className="font-semibold">{data.program.name}</h2>
              <p className="text-xs text-gray-500">Programa de lealtad</p>
            </div>
          </div>
          {data.program.description && <p className="text-sm text-gray-700 mb-2">{data.program.description}</p>}
          <p className="text-sm">
            <span className="font-medium">{data.program.stampsRequired} sellos</span> =
            <span className="font-medium" style={{ color: brandColor }}> {data.program.rewardDetail}</span>
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6 text-sm">
          Este comercio aún no configuró un programa activo.
        </div>
      )}

      {data.program && (
        <form onSubmit={onSignup} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-1">Únete al programa</h3>
          <p className="text-sm text-gray-500 mb-4">Solo necesitamos tu teléfono. Sin app, sin password.</p>

          <label className="block mb-3">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><Phone size={14} /> Teléfono</span>
            <input required type="tel" pattern="^\+\d{10,15}$" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+5219991234567" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
            <span className="text-xs text-gray-500 mt-1 block">Formato internacional. Ej. +5219991234567</span>
          </label>

          <label className="block mb-4">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><UserIcon size={14} /> Nombre (opcional)</span>
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
          </label>

          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}

          <button type="submit" disabled={submitting} className="w-full text-white rounded-lg px-4 py-2.5 font-medium disabled:opacity-50" style={{ background: brandColor }}>
            {submitting ? 'Registrando…' : 'Obtener mi tarjeta'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function PublicMerchantPage() {
  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <Suspense fallback={<div className="text-gray-500">Cargando…</div>}>
        <PublicMerchantContent />
      </Suspense>
    </main>
  );
}
