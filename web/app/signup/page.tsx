'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signup, type ApiError } from '@/lib/api';

const INDUSTRIES = [
  { value: 'cafe', label: 'Café' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'salon', label: 'Salón / Estética' },
  { value: 'retail', label: 'Retail' },
  { value: 'other', label: 'Otro' },
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', merchantName: '', industry: 'cafe' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(form);
      router.push('/dashboard/');
    } catch (err) {
      const e = err as ApiError;
      const body = e.body as { error?: string; issues?: unknown };
      if (body.error === 'email_already_registered') setError('Este email ya está registrado. Entra en lugar de crear cuenta.');
      else if (body.error === 'invalid_body') setError('Datos inválidos. Revisa email y contraseña (mín. 8 caracteres).');
      else setError(`Error: ${body.error ?? e.status}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">Crear cuenta de comercio</h1>
        <p className="text-sm text-gray-500 mb-6">Empieza a emitir tarjetas en Apple Wallet y Google Wallet en minutos.</p>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Nombre del comercio</span>
          <input required type="text" value={form.merchantName} onChange={(e) => setForm({ ...form, merchantName: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Industria</span>
          <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500 bg-white">
            {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
        </label>

        <label className="block mb-6">
          <span className="text-sm font-medium text-gray-700">Contraseña</span>
          <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
          <span className="text-xs text-gray-500 mt-1 block">Mín. 8 caracteres con número y minúscula.</span>
        </label>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

        <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium">
          {loading ? 'Creando…' : 'Crear cuenta'}
        </button>

        <p className="text-sm text-gray-500 text-center mt-4">
          ¿Ya tienes cuenta? <Link href="/login/" className="text-brand-600 hover:underline">Entrar</Link>
        </p>
      </form>
    </main>
  );
}
