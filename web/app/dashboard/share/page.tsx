'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Store, Share2, QrCode as QrIcon } from 'lucide-react';
import QrCode from '@/components/QrCode';
import { useDashboard } from '@/components/dashboard-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="space-y-4">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Compartir</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
          Invita a tus clientes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comparte tu enlace o pon el código QR en tu mostrador. El cliente da su
          teléfono y obtiene su tarjeta al instante, sin instalar nada.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg border bg-background text-muted-foreground">
              <Share2 size={15} />
            </span>
            <CardTitle>Tu enlace público</CardTitle>
            </div>
          </CardHeader>
          <CardContent>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-xl border bg-muted px-3 py-2.5 font-mono text-sm text-foreground sm:truncate">
              {publicUrl || 'Generando enlace…'}
            </code>
            <Button
              onClick={copyLink}
              disabled={!publicUrl}
              variant="loyalty"
              className="shrink-0"
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
            </Button>
            <span className="sr-only" aria-live="polite">
              {copied ? 'Enlace copiado al portapapeles.' : ''}
            </span>
          </div>

          <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-muted-foreground">·</span>
              Mándalo por WhatsApp a tus clientes frecuentes.
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground">·</span>
              Pégalo en tu biografía de Instagram o Facebook.
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground">·</span>
              Inclúyelo en tu firma de correo o tickets.
            </li>
          </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg border bg-background text-muted-foreground">
              <QrIcon size={15} />
            </span>
            <CardTitle>Código QR</CardTitle>
            </div>
          </CardHeader>
          <CardContent>

          <div className="flex flex-col items-center">
            <div className="rounded-2xl border bg-background p-3">
              {publicUrl ? (
                <QrCode value={publicUrl} size={220} />
              ) : (
                <Skeleton className="h-[220px] w-[220px]" />
              )}
            </div>
            <Alert variant="warning" className="mt-4">
              <Store size={16} className="shrink-0" />
              <AlertDescription>Pon este QR en tu mostrador</AlertDescription>
            </Alert>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              El cliente lo escanea con la cámara y se registra solo.
            </p>
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
