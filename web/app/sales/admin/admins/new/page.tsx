'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSalesAdmin, decodeJwtClaims, apiErrorMessage } from '@/lib/api';

export default function NewAdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  // Solo integra_admin puede crear sales_admin.
  useEffect(() => {
    const role = decodeJwtClaims()?.role;
    if (role !== 'integra_admin') router.replace('/sales/admin');
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await createSalesAdmin({ email });
      setCreated({ email: res.admin.email, tempPassword: res.tempPassword });
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'No se pudo crear el admin de ventas'));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-lg">
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Admin de ventas creado</h1>
        <p className="text-sm text-zinc-600 mb-4">
          Comparte estas credenciales por canal seguro. La contraseña temporal solo se muestra una vez.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm space-y-2">
          <div>
            <span className="text-zinc-500">Email:</span>{' '}
            <span className="font-mono">{created.email}</span>
          </div>
          <div>
            <span className="text-zinc-500">Contraseña temporal:</span>{' '}
            <span className="font-mono select-all">{created.tempPassword}</span>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push('/sales/admin')}
            className="bg-zinc-900 text-white px-4 py-2 rounded text-sm hover:bg-zinc-800"
          >
            Volver al panel
          </button>
          <button
            onClick={() => {
              setCreated(null);
              setEmail('');
            }}
            className="text-zinc-600 px-4 py-2 text-sm"
          >
            Crear otro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-zinc-900 mb-1">Alta de admin de ventas</h1>
      <p className="text-sm text-zinc-600 mb-6">
        Un admin de ventas recluta y gestiona su propio equipo de vendedores. Recibirá una
        contraseña temporal para su primer ingreso.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Email del admin de ventas</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm"
            placeholder="maximiliano@integra-group.ai"
            autoCapitalize="none"
          />
        </label>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email}
          className="bg-zinc-900 text-white px-4 py-2 rounded text-sm hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? 'Creando…' : 'Crear admin de ventas'}
        </button>
      </form>
    </div>
  );
}
