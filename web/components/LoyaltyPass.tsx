'use client';

import { useState } from 'react';
import { Award, RotateCcw, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface LoyaltyPassProps {
  merchantName: string;
  /** Color de marca en hex (#rrggbb). */
  brandColor?: string;
  /** Texto bajo el nombre (giro / lema). */
  tagline?: string;
  /** Iniciales o texto del logo (si no hay imagen). */
  logoText?: string;
  programName: string;
  stampsRequired: number;
  rewardDetail: string;
  /** Sellos actuales (0 en preview). */
  stamps?: number;
  /** Id de tarjeta para el código (demo si se omite). */
  cardId?: string;
  customerName?: string;
  customerPhone?: string;
  /** 'live' muestra datos reales; 'preview' es para el editor. */
  variant?: 'live' | 'preview';
  className?: string;
}

/** Devuelve negro o blanco según contraste sobre el color de marca. */
function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.6 ? '#111827' : '#ffffff';
}

function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(c + amt)))
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export default function LoyaltyPass({
  merchantName,
  brandColor = '#4f46e5',
  tagline,
  logoText,
  programName,
  stampsRequired,
  rewardDetail,
  stamps = 0,
  cardId,
  customerName,
  customerPhone,
  variant = 'live',
  className,
}: LoyaltyPassProps) {
  const [flipped, setFlipped] = useState(false);
  const fg = readableOn(brandColor);
  const dim = fg === '#ffffff' ? 'rgba(255,255,255,0.72)' : 'rgba(17,24,39,0.6)';
  const line = fg === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(17,24,39,0.12)';
  const total = Math.max(1, stampsRequired);
  const filled = Math.min(stamps, total);
  const complete = stamps >= total;
  const initials =
    logoText?.trim() ||
    merchantName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase();
  const code = (cardId ?? 'INTEGRA-DEMO-0001').slice(0, 22);

  return (
    <div className={cn('w-full max-w-sm select-none', className)}>
      <div
        className="relative rounded-[26px] shadow-2xl ring-1 ring-black/5 overflow-hidden"
        style={{
          background: `linear-gradient(150deg, ${brandColor} 0%, ${shade(brandColor, -28)} 100%)`,
          color: fg,
        }}
      >
        {/* glare */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-20 blur-2xl"
          style={{ background: fg }}
        />

        {!flipped ? (
          <div className="relative p-6">
            <header className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl grid place-items-center text-base font-bold ring-1"
                style={{ background: fg, color: brandColor, borderColor: line }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-tight truncate">{merchantName}</p>
                <p className="text-[11px] uppercase tracking-widest truncate" style={{ color: dim }}>
                  {tagline || programName}
                </p>
              </div>
              <span
                className="ml-auto text-[10px] uppercase tracking-widest px-2 py-1 rounded-full"
                style={{ background: line, color: dim }}
              >
                Lealtad
              </span>
            </header>

            <div className="mt-7">
              <p className="text-[11px] uppercase tracking-widest" style={{ color: dim }}>
                Sellos
              </p>
              <p className="text-5xl font-semibold tracking-tight tabular-nums">
                {filled}
                <span className="text-2xl" style={{ color: dim }}>
                  {' '}
                  / {total}
                </span>
              </p>
              <p className="text-xs mt-1" style={{ color: dim }}>
                {complete ? '¡Premio listo para canjear!' : `Te faltan ${total - filled} para tu premio`}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-8 gap-2">
              {Array.from({ length: total }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-full grid place-items-center transition-transform"
                  style={
                    i < filled
                      ? { background: fg, color: brandColor, transform: 'scale(1)' }
                      : { background: line, color: dim }
                  }
                >
                  <Award size={14} />
                </div>
              ))}
            </div>

            <div
              className="mt-6 pt-4 flex items-end justify-between gap-3"
              style={{ borderTop: `1px solid ${line}` }}
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest" style={{ color: dim }}>
                  Premio
                </p>
                <p className="text-sm font-medium truncate">{rewardDetail}</p>
              </div>
              {/* código de barras / QR (decorativo en demo) */}
              <div className="rounded-md px-2 py-1.5" style={{ background: fg }}>
                <div className="flex items-end gap-[2px] h-7">
                  {code.split('').map((c, i) => (
                    <span
                      key={i}
                      style={{
                        background: brandColor,
                        width: 2,
                        height: 12 + ((c.charCodeAt(0) + i) % 16),
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="absolute top-5 right-5 opacity-60 hover:opacity-100 transition"
              style={{ color: fg }}
              aria-label="Ver reverso"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        ) : (
          <div className="relative p-6 min-h-[340px] flex flex-col">
            <p className="text-[11px] uppercase tracking-widest" style={{ color: dim }}>
              Detalles
            </p>
            <h3 className="text-lg font-semibold mt-1">{programName}</h3>

            <dl className="mt-5 space-y-3 text-sm flex-1">
              {customerName && (
                <Row label="Titular" value={customerName} dim={dim} line={line} />
              )}
              {customerPhone && (
                <Row label="Teléfono" value={customerPhone} dim={dim} line={line} />
              )}
              <Row label="Programa" value={`${total} sellos = ${rewardDetail}`} dim={dim} line={line} />
              <Row label="ID de tarjeta" value={code} dim={dim} line={line} />
            </dl>

            <div className="flex items-center gap-2 text-xs" style={{ color: dim }}>
              <MapPin size={13} /> Recibe un aviso al pasar cerca de {merchantName}.
            </div>

            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="absolute top-5 right-5 opacity-60 hover:opacity-100 transition"
              style={{ color: fg }}
              aria-label="Ver frente"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        )}
      </div>

      {complete && variant === 'live' && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm font-medium">
          <Sparkles size={16} /> Muestra esta tarjeta en el mostrador para canjear tu premio.
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  dim,
  line,
}: {
  label: string;
  value: string;
  dim: string;
  line: string;
}) {
  return (
    <div className="flex justify-between gap-4" style={{ borderBottom: `1px solid ${line}`, paddingBottom: 10 }}>
      <dt style={{ color: dim }}>{label}</dt>
      <dd className="font-medium text-right truncate max-w-[60%]">{value}</dd>
    </div>
  );
}
