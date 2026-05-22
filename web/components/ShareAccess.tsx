'use client';

import { useState } from 'react';

/**
 * Tarjeta de credenciales recién creadas + acciones para compartirlas.
 * El admin entrega esto al nuevo Vendedor/Admin por canal seguro: incluye
 * la URL de login (derivada del origin actual, así funciona con cualquier
 * dominio), el email y la contraseña temporal.
 */
export default function ShareAccess({
  email,
  tempPassword,
  kind,
}: {
  email: string;
  tempPassword: string;
  kind: 'Vendedor' | 'Admin';
}) {
  const [copied, setCopied] = useState(false);

  const loginUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';

  const shareText = `Tu acceso a Integra (${kind})

Entra aquí: ${loginUrl}
Email: ${email}
Contraseña temporal: ${tempPassword}

Al entrar, el sistema te lleva directo a tu panel. Cambia la contraseña en tu primer ingreso.`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard no disponible — el usuario puede seleccionar el texto a mano */
    }
  }

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Acceso a Integra', text: shareText });
        return;
      } catch {
        /* el usuario canceló el share sheet — caemos a copiar */
      }
    }
    await copy();
  }

  return (
    <div className="space-y-3">
      {/* Tarjeta de credenciales */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        <CredRow label="URL de acceso" value={loginUrl} mono break />
        <CredRow label="Email" value={email} mono />
        {/* Contraseña destacada */}
        <div className="flex flex-col gap-1 px-4 py-3 bg-[#4f7d2a]/5">
          <span className="text-[11px] uppercase tracking-wide text-zinc-500">
            Contraseña temporal
          </span>
          <span className="font-mono text-lg font-semibold text-[#3d6520] select-all">
            {tempPassword}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={share}
          className="flex-1 bg-[#4f7d2a] hover:bg-[#3d6520] text-white px-4 py-2.5 rounded-lg text-sm font-medium min-h-[44px]"
        >
          Compartir acceso
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex-1 border border-zinc-300 text-zinc-700 px-4 py-2.5 rounded-lg text-sm hover:bg-zinc-50 min-h-[44px]"
        >
          {copied ? 'Copiado ✓' : 'Copiar credenciales'}
        </button>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-zinc-400">
        <span aria-hidden>🔒</span>
        <span>
          La contraseña temporal solo se muestra una vez. Compártela por un canal
          seguro (no por correo abierto).
        </span>
      </p>
    </div>
  );
}

function CredRow({
  label,
  value,
  mono,
  break: brk,
}: {
  label: string;
  value: string;
  mono?: boolean;
  break?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 border-b border-zinc-100">
      <span className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span
        className={`text-sm text-zinc-900 select-all ${mono ? 'font-mono' : ''} ${
          brk ? 'break-all' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}
