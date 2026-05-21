'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createSalesRep,
  listSalesAdmins,
  decodeJwtClaims,
  apiErrorMessage,
  type SalesAdmin,
} from '@/lib/api';
import ShareAccess from '@/components/ShareAccess';

export default function NewRepPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ userId: string; tempPassword: string } | null>(null);

  // integra_admin debe elegir bajo qué sales_admin va el rep.
  const [isIntegraAdmin, setIsIntegraAdmin] = useState(false);
  const [admins, setAdmins] = useState<SalesAdmin[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  useEffect(() => {
    const role = decodeJwtClaims()?.role;
    if (role === 'integra_admin') {
      setIsIntegraAdmin(true);
      setLoadingAdmins(true);
      listSalesAdmins()
        .then((res) => {
          setAdmins(res.admins);
          if (res.admins.length > 0) setSelectedAdminId(res.admins[0].userId);
        })
        .catch(() => setError('No se pudieron cargar los admins de ventas'))
        .finally(() => setLoadingAdmins(false));
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // sales_admin → el backend lo auto-vincula. integra_admin → manda salesAdminId.
      const res = await createSalesRep(
        isIntegraAdmin ? { email, salesAdminId: selectedAdminId } : { email }
      );
      setCreated({ userId: res.rep.userId, tempPassword: res.tempPassword });
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'No se pudo crear el vendedor'));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-lg">
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Vendedor creado</h1>
        <p className="text-sm text-zinc-600 mb-4">
          Comparte el acceso con el vendedor. Al entrar, el sistema lo lleva directo a su panel.
        </p>
        <ShareAccess email={email} tempPassword={created.tempPassword} kind="vendedor" />
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push(`/sales/admin/reps?id=${encodeURIComponent(created.userId)}`)}
            className="bg-zinc-900 text-white px-4 py-2 rounded text-sm hover:bg-zinc-800"
          >
            Ver detalle
          </button>
          <button
            onClick={() => router.push('/sales/admin')}
            className="text-zinc-600 px-4 py-2 text-sm"
          >
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  // integra_admin sin ningún sales_admin creado: no puede dar de alta reps todavía.
  if (isIntegraAdmin && !loadingAdmins && admins.length === 0) {
    return (
      <div className="max-w-lg">
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Alta de vendedor</h1>
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-900">
          Todavía no hay ningún admin de ventas. Un vendedor siempre va bajo un admin —
          crea primero un admin de ventas.
        </div>
        <Link
          href="/sales/admin/admins/new"
          className="inline-block mt-4 bg-zinc-900 text-white px-4 py-2 rounded text-sm hover:bg-zinc-800"
        >
          Crear admin de ventas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-zinc-900 mb-1">Alta de vendedor</h1>
      <p className="text-sm text-zinc-600 mb-6">
        {isIntegraAdmin
          ? 'El vendedor quedará bajo el admin de ventas que elijas.'
          : 'El nuevo vendedor quedará bajo tu equipo.'}{' '}
        Recibirá una contraseña temporal para su primer ingreso.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        {isIntegraAdmin && (
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Admin de ventas</span>
            <select
              required
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              disabled={loadingAdmins}
              className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm bg-white"
            >
              {loadingAdmins && <option>Cargando…</option>}
              {admins.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.email}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Email del vendedor</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-zinc-200 rounded px-3 py-2 text-sm"
            placeholder="daniela@integra-group.ai"
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
          disabled={submitting || !email || (isIntegraAdmin && !selectedAdminId)}
          className="bg-zinc-900 text-white px-4 py-2 rounded text-sm hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? 'Creando…' : 'Crear vendedor'}
        </button>
      </form>
    </div>
  );
}
