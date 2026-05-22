'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSalesAdmin, decodeJwtClaims, apiErrorMessage } from '@/lib/api';
import ShareAccess from '@/components/ShareAccess';
import IntegraLogo from '@/components/IntegraLogo';

export default function NewAdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  // Solo el Super Admin (integra_admin) puede crear Admins.
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
      setError(apiErrorMessage(e, 'No se pudo crear el Admin'));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <FormShell title="Admin creado" subtitle="Comparte el acceso. Al entrar, el sistema lo lleva directo a su panel.">
        <ShareAccess email={created.email} tempPassword={created.tempPassword} kind="Admin" />
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => router.push('/sales/admin')}
            className="flex-1 bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-2.5 rounded-lg text-sm font-medium"
          >
            Volver al panel
          </button>
          <button
            onClick={() => {
              setCreated(null);
              setEmail('');
            }}
            className="flex-1 border border-zinc-300 text-zinc-700 px-4 py-2.5 rounded-lg text-sm hover:bg-zinc-50"
          >
            Crear otro
          </button>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Alta de Admin"
      subtitle="Un Admin recluta y gestiona su propio equipo de Vendedores. Recibirá una contraseña temporal para su primer ingreso."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email del Admin">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm min-h-[44px] focus:border-[#4f7d2a] focus:outline-none"
            placeholder="maximiliano@integra-group.ai"
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
          disabled={submitting || !email}
          className="w-full bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-2.5 rounded-lg text-sm font-medium min-h-[44px] disabled:opacity-50"
        >
          {submitting ? 'Creando…' : 'Crear Admin'}
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
