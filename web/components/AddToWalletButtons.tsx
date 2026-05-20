'use client';

import { useState } from 'react';
import { Apple, Wallet, Info } from 'lucide-react';

interface Props {
  /** URL del .pkpass firmado (cuando exista cert Apple). */
  appleUrl?: string;
  /** URL "Save to Google Wallet" (JWT). */
  googleUrl?: string;
}

/**
 * Botones oficiales "Agregar a Wallet". Si no hay URLs (demo sin
 * certificado Apple), explican el estado en vez de fallar.
 */
export default function AddToWalletButtons({ appleUrl, googleUrl }: Props) {
  const [note, setNote] = useState(false);
  const demo = !appleUrl && !googleUrl;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <a
          href={appleUrl || undefined}
          onClick={(e) => {
            if (!appleUrl) {
              e.preventDefault();
              setNote(true);
            }
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-black text-white text-sm font-medium px-3 py-2.5 active:scale-95 transition"
        >
          <Apple size={16} /> Apple Wallet
        </a>
        <a
          href={googleUrl || undefined}
          onClick={(e) => {
            if (!googleUrl) {
              e.preventDefault();
              setNote(true);
            }
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-black text-white text-sm font-medium px-3 py-2.5 active:scale-95 transition"
        >
          <Wallet size={16} /> Google Wallet
        </a>
      </div>

      {demo && note && (
        <p className="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Info size={13} className="mt-0.5 flex-shrink-0" />
          En esta demo la tarjeta vive en esta pantalla. Al activar la cuenta
          Apple Developer de Integra, este botón agrega el pase nativo con
          notificaciones push y geolocalización.
        </p>
      )}
    </div>
  );
}
