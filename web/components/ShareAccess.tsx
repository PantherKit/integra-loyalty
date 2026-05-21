'use client';

import { useState } from 'react';

/**
 * Tarjeta de credenciales recién creadas + acciones para compartirlas.
 * El admin entrega esto al nuevo vendedor/admin por canal seguro: incluye
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
  kind: 'vendedor' | 'admin de ventas';
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
      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm space-y-2">
        <div>
          <span className="text-zinc-500">URL de acceso:</span>{' '}
          <span className="font-mono select-all break-all">{loginUrl}</span>
        </div>
        <div>
          <span className="text-zinc-500">Email:</span>{' '}
          <span className="font-mono select-all">{email}</span>
        </div>
        <div>
          <span className="text-zinc-500">Contraseña temporal:</span>{' '}
          <span className="font-mono select-all">{tempPassword}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={share}
          className="flex-1 bg-zinc-900 text-white px-4 py-2 rounded text-sm hover:bg-zinc-800"
        >
          Compartir acceso
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex-1 border border-zinc-300 text-zinc-700 px-4 py-2 rounded text-sm hover:bg-zinc-50"
        >
          {copied ? 'Copiado ✓' : 'Copiar credenciales'}
        </button>
      </div>
      <p className="text-xs text-zinc-400">
        La contraseña temporal solo se muestra una vez. Compártela por un canal seguro
        (no por correo abierto).
      </p>
    </div>
  );
}
