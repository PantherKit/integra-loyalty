'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, decodeJwtClaims, homeForRole, type ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form);
      // Routing por rol: el usuario nunca escribe la URL de su consola.
      // Tras autenticar, lo enviamos a su home según custom:role.
      const role = decodeJwtClaims()?.role;
      let dest = homeForRole(role);
      // Deep-link: si venía de una ruta protegida (p. ej. dar sello con
      // ?card=...), respetamos ese destino si pertenece a su consola.
      if (typeof window !== 'undefined') {
        const next = new URLSearchParams(window.location.search).get('next');
        if (next && next.startsWith(homeForRole(role))) dest = next;
      }
      router.push(dest);
    } catch (err) {
      const e = err as ApiError;
      const body = e.body as { error?: string };
      if (body.error === 'invalid_credentials') setError('Email o contraseña incorrectos.');
      else setError(`Error: ${body.error ?? e.status}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold mb-1">Entrar</h1>
        <p className="text-sm text-gray-500 mb-6">Accede a tu panel de comercio.</p>

        <label className="block mb-3">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
        </label>

        <label className="block mb-6">
          <span className="text-sm font-medium text-gray-700">Contraseña</span>
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
        </label>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

        <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-sm text-gray-500 text-center mt-4">
          ¿No tienes cuenta? <Link href="/signup/" className="text-brand-600 hover:underline">Crear cuenta</Link>
        </p>
      </form>
    </main>
  );
}
