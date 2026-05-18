'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Award, Share2 } from 'lucide-react';
import { useDashboard } from '@/components/dashboard-context';
import {
  createProgram,
  listMyPrograms,
  type LoyaltyProgram,
} from '@/lib/api';

const REWARD_TYPES = [
  { value: 'free_item', label: 'Item gratis' },
  { value: 'discount_percent', label: 'Descuento %' },
  { value: 'discount_amount', label: 'Descuento $ fijo' },
  { value: 'custom', label: 'Otro / Custom' },
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyPrograms()
      .then((r) => setItems(r.items))
      .catch(() =>
        setError('No pudimos cargar tus programas. Reintenta más tarde.')
      )
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    } catch {
      setError('No se pudo crear el programa. Revisa los campos.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Programa
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">
            Programas de lealtad
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Define cuántos sellos necesita un cliente y qué premio recibe.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={15} /> Nuevo programa
        </button>
      </header>

      {merchant && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
          <div className="text-sm">
            <p className="font-medium text-gray-800">
              Comparte tu programa con tus clientes
            </p>
            <p className="text-xs text-gray-600">
              Tu enlace público:{' '}
              <code className="rounded bg-white px-1">/c/?s={merchant.slug}</code>
            </p>
          </div>
          <Link
            href="/dashboard/share/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            <Share2 size={15} /> Ver QR y enlace
          </Link>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={onCreate}
          className="rounded-xl border border-gray-200 bg-white p-5"
        >
          <h2 className="mb-3 font-semibold text-gray-900">Crear programa</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Nombre</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='ej. "Café gratis"'
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Sellos requeridos
              </span>
              <input
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Tipo de premio
              </span>
              <select
                value={form.rewardType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rewardType: e.target
                      .value as LoyaltyProgram['rewardType'],
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-brand-500"
              >
                {REWARD_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Premio (descripción)
              </span>
              <input
                required
                value={form.rewardDetail}
                onChange={(e) =>
                  setForm({ ...form, rewardDetail: e.target.value })
                }
                placeholder='ej. "Café americano gratis"'
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand-500"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">
                Descripción (opcional)
              </span>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-brand-500"
                rows={2}
              />
            </label>
          </div>
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Creando…' : 'Crear programa'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Award size={20} />
          </div>
          <h3 className="mb-1 font-semibold text-gray-900">
            Aún no tienes programas
          </h3>
          <p className="text-sm text-gray-500">
            Crea tu primer programa de lealtad para empezar a registrar
            clientes.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li
              key={p.programId}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Award size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="truncate text-xs text-gray-500">
                  {p.stampsRequired} sellos · {p.rewardDetail}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                  p.status === 'active'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {p.status === 'active'
                  ? 'Activo'
                  : p.status === 'paused'
                    ? 'Pausado'
                    : 'Archivado'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
