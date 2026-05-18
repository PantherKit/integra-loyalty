'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Store, Share2, QrCode as QrIcon } from 'lucide-react';
import QrCode from '@/components/QrCode';
import { useDashboard } from '@/components/dashboard-context';

export default function SharePage() {
  const { merchant } = useDashboard();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicUrl = useMemo(() => {
    if (!merchant) return '';
    const base = origin || 'https://lealtad.integra-group.ai';
    return `${base}/c/?s=${encodeURIComponent(merchant.slug)}`;
  }, [merchant, origin]);

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      // fallback para navegadores sin Clipboard API
      const ta = document.createElement('textarea');
      ta.value = publicUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">Compartir</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">
          Invita a tus clientes
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Comparte tu enlace o pon el código QR en tu mostrador. El cliente da su
          teléfono y obtiene su tarjeta al instante, sin instalar nada.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Enlace público */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <Share2 size={16} />
            </span>
            <h2 className="font-semibold text-gray-900">Tu enlace público</h2>
          </div>

          <div className="flex items-stretch gap-2">
            <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
              {publicUrl || 'Generando enlace…'}
            </code>
            <button
              onClick={copyLink}
              disabled={!publicUrl}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              aria-label="Copiar enlace"
            >
              {copied ? (
                <>
                  <Check size={15} /> Copiado
                </>
              ) : (
                <>
                  <Copy size={15} /> Copiar
                </>
              )}
            </button>
          </div>

          <ul className="mt-5 space-y-2.5 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-brand-600">·</span>
              Mándalo por WhatsApp a tus clientes frecuentes.
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600">·</span>
              Pégalo en tu biografía de Instagram o Facebook.
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600">·</span>
              Inclúyelo en tu firma de correo o tickets.
            </li>
          </ul>
        </section>

        {/* QR */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <QrIcon size={16} />
            </span>
            <h2 className="font-semibold text-gray-900">Código QR</h2>
          </div>

          <div className="flex flex-col items-center">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              {publicUrl ? (
                <QrCode value={publicUrl} size={220} />
              ) : (
                <div className="h-[220px] w-[220px] animate-pulse rounded-lg bg-gray-100" />
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              <Store size={16} className="shrink-0" />
              Pon este QR en tu mostrador
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">
              El cliente lo escanea con la cámara y se registra solo.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
