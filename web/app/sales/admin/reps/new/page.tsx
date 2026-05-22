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
import IntegraLogo from '@/components/IntegraLogo';

export default function NewRepPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ userId: string; tempPassword: string } | null>(null);

  // integra_admin debe elegir bajo qué Admin va el Vendedor.
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
        .catch(() => setError('No se pudieron cargar los Admins'))
        .finally(() => setLoadingAdmins(false));
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
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
      <FormShell title="Vendedor creado" subtitle="Comparte el acceso. Al entrar, el sistema lo lleva directo a su panel.">
        <ShareAccess email={email} tempPassword={created.tempPassword} kind="Vendedor" />
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => router.push(`/sales/admin/reps?id=${encodeURIComponent(created.userId)}`)}
            className="flex-1 bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            Ver detalle
          </button>
          <button
            onClick={() => router.push('/sales/admin')}
            className="flex-1 border border-zinc-300 text-zinc-700 px-4 py-2.5 rounded-lg text-sm hover:bg-zinc-50"
          >
            Volver al panel
          </button>
        </div>
      </FormShell>
    );
  }

  // integra_admin sin ningún Admin creado: no puede dar de alta vendedores aún.
  if (isIntegraAdmin && !loadingAdmins && admins.length === 0) {
    return (
      <FormShell title="Alta de Vendedor">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          Todavía no hay ningún Admin. Un Vendedor siempre va bajo un Admin — crea primero un Admin.
        </div>
        <Link
          href="/sales/admin/admins/new"
          className="inline-block mt-4 bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          Crear Admin
        </Link>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Alta de Vendedor"
      subtitle={`${
        isIntegraAdmin
          ? 'El Vendedor quedará bajo el Admin que elijas.'
          : 'El nuevo Vendedor quedará en tu equipo.'
      } Recibirá una contraseña temporal para su primer ingreso.`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {isIntegraAdmin && (
          <Field label="Admin">
            <select
              required
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              disabled={loadingAdmins}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm bg-white min-h-[44px] focus:border-[#4f7d2a] focus:outline-none"
            >
              {loadingAdmins && <option>Cargando…</option>}
              {admins.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {a.email}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Email del Vendedor">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:border-[#4f7d2a] focus:outline-none"
            placeholder="daniela@integra-group.ai"
            autoCapitalize="none"
          />
        </Field>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email || (isIntegraAdmin && !selectedAdminId)}
          className="w-full bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-2.5 rounded-lg text-sm font-medium min-h-[44px] disabled:opacity-50"
        >
          {submitting ? 'Creando…' : 'Crear Vendedor'}
        </button>
      </form>
    </FormShell>
  );
}

/** Tarjeta de formulario con mini-header de marca Integra. Local a esta página. */
function FormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/sales/admin"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-[#4f7d2a] mb-4"
      >
        ← Volver al panel
      </Link>
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100">
          <span className="grid place-items-center w-7 h-7 rounded-md bg-[#4f7d2a] text-white">
            <IntegraLogo size={16} />
          </span>
          <span className="text-sm font-semibold text-zinc-900">Integra · Sales Org</span>
        </div>
        <div className="p-5">
          <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500 mt-1 mb-5">{subtitle}</p>}
          {!subtitle && <div className="mb-4" />}
          {children}
        </div>
      </div>
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
