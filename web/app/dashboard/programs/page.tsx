'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowLeft, Award } from 'lucide-react';
import { createProgram, getToken, listMyPrograms, getMyMerchant, type LoyaltyProgram, type Merchant } from '@/lib/api';

const REWARD_TYPES = [
  { value: 'free_item', label: 'Item gratis' },
  { value: 'discount_percent', label: 'Descuento %' },
  { value: 'discount_amount', label: 'Descuento $ fijo' },
  { value: 'custom', label: 'Otro / Custom' },
] as const;

export default function ProgramsPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [items, setItems] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', stampsRequired: 7, rewardType: 'free_item' as const, rewardDetail: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.push('/login/'); return; }
    Promise.all([listMyPrograms(), getMyMerchant()])
      .then(([progs, m]) => { setItems(progs.items); setMerchant(m); })
      .catch(() => router.push('/login/'))
      .finally(() => setLoading(false));
  }, [router]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await createProgram(form);
      setItems((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ name: '', description: '', stampsRequired: 7, rewardType: 'free_item', rewardDetail: '' });
    } catch (e) {
      setError('Error al crear programa. Revisa los campos.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="flex-1 grid place-items-center"><div className="text-gray-500">Cargando…</div></main>;

  const publicUrl = merchant ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/?s=${merchant.slug}` : '';

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard/" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"><ArrowLeft size={14} /> Dashboard</Link>
          <span className="font-semibold tracking-tight ml-2">Programas de lealtad</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {merchant && (
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Link público de tu comercio:</span>{' '}
              <Link href={`/c/?s=${merchant.slug}`} className="text-brand-600 hover:underline">{publicUrl}</Link>
            </p>
            <p className="text-gray-500 text-xs mt-1">Comparte este link con tus clientes para que se registren en tu programa de lealtad.</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold tracking-tight">Tus programas ({items.length})</h1>
          <button onClick={() => setShowForm((s) => !s)} className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5">
            <Plus size={14} /> Nuevo programa
          </button>
        </div>

        {showForm && (
          <form onSubmit={onCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h2 className="font-semibold mb-3">Crear programa</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Nombre</span>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder='ej. "Café gratis"' className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Sellos requeridos</span>
                <input required type="number" min={1} max={50} value={form.stampsRequired} onChange={(e) => setForm({ ...form, stampsRequired: parseInt(e.target.value, 10) })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Tipo de premio</span>
                <select value={form.rewardType} onChange={(e) => setForm({ ...form, rewardType: e.target.value as typeof form.rewardType })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500 bg-white">
                  {REWARD_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Premio (descripción)</span>
                <input required value={form.rewardDetail} onChange={(e) => setForm({ ...form, rewardDetail: e.target.value })} placeholder='ej. "Café americano gratis"' className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">Descripción (opcional)</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" rows={2} />
              </label>
            </div>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mt-3">{error}</div>}
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-600 px-4 py-2">Cancelar</button>
              <button type="submit" disabled={submitting} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium">{submitting ? 'Creando…' : 'Crear programa'}</button>
            </div>
          </form>
        )}

        {items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 grid place-items-center mx-auto mb-3"><Award size={20} /></div>
            <h3 className="font-semibold mb-1">Aún no tienes programas</h3>
            <p className="text-sm text-gray-500">Crea tu primer programa de lealtad para empezar a registrar clientes.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((p) => (
              <li key={p.programId} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Award size={18} /></div>
                <div className="flex-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.stampsRequired} sellos · {p.rewardDetail}</div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.status === 'active' ? 'text-green-700 bg-green-50' : 'text-gray-600 bg-gray-100'}`}>{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
