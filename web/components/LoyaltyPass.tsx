'use client';

import { useState } from 'react';
import { Award, RotateCcw, MapPin, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface LoyaltyPassProps {
  merchantName: string;
  /** Color de marca en hex (#rrggbb). */
  brandColor?: string;
  /** Texto bajo el nombre (giro / lema). */
  tagline?: string;
  /** Iniciales si no hay logo. */
  logoText?: string;
  /** Logo del comercio (data URL o http). Tiene prioridad sobre logoText. */
  logoUrl?: string;
  programName: string;
  stampsRequired: number;
  rewardDetail: string;
  /** Sellos actuales (0 en preview). */
  stamps?: number;
  /** Id de tarjeta. */
  cardId?: string;
  customerName?: string;
  customerPhone?: string;
  /** 'live' muestra datos reales; 'preview' es para el editor. */
  variant?: 'live' | 'preview';
  className?: string;
}

/** Negro o blanco según contraste sobre el color de marca. */
function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.62 ? '#111827' : '#ffffff';
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
  logoUrl,
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
  const dark = fg === '#ffffff';
  const dim = dark ? 'rgba(255,255,255,0.70)' : 'rgba(17,24,39,0.58)';
  const line = dark ? 'rgba(255,255,255,0.16)' : 'rgba(17,24,39,0.10)';
  const chipBg = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
  const total = Math.max(1, stampsRequired);
  const filled = Math.min(Math.max(0, stamps), total);
  const complete = stamps >= total;
  const pct = Math.round((filled / total) * 100);
  const initials =
    logoText?.trim() ||
    merchantName
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase();

  return (
    <div className={cn('w-full max-w-sm select-none', className)}>
      <div
        className="relative rounded-[28px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] overflow-hidden"
        style={{
          background: `linear-gradient(155deg, ${shade(brandColor, 18)} 0%, ${brandColor} 45%, ${shade(brandColor, -34)} 100%)`,
          color: fg,
        }}
      >
        {/* brillos suaves */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full blur-3xl"
          style={{ background: fg, opacity: 0.14 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 w-52 h-52 rounded-full blur-3xl"
          style={{ background: fg, opacity: 0.08 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[28px]"
          style={{ boxShadow: `inset 0 0 0 1px ${line}` }}
        />

        {!flipped ? (
          <div className="relative p-6">
            <header className="flex items-center gap-3">
              <div
                className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl grid place-items-center font-bold"
                style={{ background: '#fff', color: brandColor }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={merchantName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-base">{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight truncate text-[15px]">
                  {merchantName}
                </p>
                <p
                  className="text-[10.5px] uppercase tracking-[0.16em] truncate mt-0.5"
                  style={{ color: dim }}
                >
                  {tagline || programName}
                </p>
              </div>
              <span
                className="text-[9.5px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ background: chipBg, color: fg }}
              >
                Lealtad
              </span>
            </header>

            <div className="mt-8 flex items-end justify-between">
              <div>
                <p
                  className="text-[10.5px] uppercase tracking-[0.18em]"
                  style={{ color: dim }}
                >
                  Sellos
                </p>
                <p className="text-[44px] leading-none font-semibold tracking-tight tabular-nums mt-1.5">
                  {filled}
                  <span className="text-2xl font-normal" style={{ color: dim }}>
                    {' '}/ {total}
                  </span>
                </p>
              </div>
              <p
                className="text-xs text-right max-w-[45%] leading-snug pb-1"
                style={{ color: dim }}
              >
                {complete
                  ? '¡Premio listo para canjear!'
                  : `Te faltan ${total - filled} para tu premio`}
              </p>
            </div>

            {/* barra de progreso */}
            <div
              className="mt-4 h-1.5 w-full rounded-full overflow-hidden"
              style={{ background: line }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: fg }}
              />
            </div>

            {/* sellos */}
            <div className="mt-5 flex flex-wrap gap-2">
              {Array.from({ length: total }).map((_, i) => (
                <div
                  key={i}
                  className="grid place-items-center rounded-full"
                  style={{
                    width: total > 10 ? 26 : 30,
                    height: total > 10 ? 26 : 30,
                    background: i < filled ? fg : 'transparent',
                    color: i < filled ? brandColor : dim,
                    border: i < filled ? 'none' : `1.5px solid ${line}`,
                  }}
                >
                  {i < filled ? <Check size={14} strokeWidth={3} /> : <Award size={13} />}
                </div>
              ))}
            </div>

            <div
              className="mt-6 pt-4"
              style={{ borderTop: `1px solid ${line}` }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ color: dim }}
              >
                Tu premio
              </p>
              <p className="text-[15px] font-medium mt-0.5 truncate">
                {rewardDetail}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="absolute bottom-5 right-5 grid h-8 w-8 place-items-center rounded-full transition hover:scale-105"
              style={{ background: chipBg, color: fg }}
              aria-label="Ver detalles"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        ) : (
          <div className="relative p-6 min-h-[360px] flex flex-col">
            <p
              className="text-[10.5px] uppercase tracking-[0.18em]"
              style={{ color: dim }}
            >
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
              <Row
                label="Programa"
                value={`${total} sellos = ${rewardDetail}`}
                dim={dim}
                line={line}
              />
              {cardId && (
                <Row
                  label="ID"
                  value={cardId.slice(0, 8).toUpperCase()}
                  dim={dim}
                  line={line}
                />
              )}
            </dl>

            <div className="flex items-center gap-2 text-xs" style={{ color: dim }}>
              <MapPin size={13} /> Recibe un aviso al pasar cerca de {merchantName}.
            </div>

            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="absolute bottom-5 right-5 grid h-8 w-8 place-items-center rounded-full transition hover:scale-105"
              style={{ background: chipBg, color: fg }}
              aria-label="Ver frente"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}
      </div>

      {complete && variant === 'live' && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm font-medium">
          <Sparkles size={16} /> Muestra esta tarjeta en el mostrador para
          canjear tu premio.
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
    <div
      className="flex justify-between gap-4 pb-2.5"
      style={{ borderBottom: `1px solid ${line}` }}
    >
      <dt style={{ color: dim }}>{label}</dt>
      <dd className="font-medium text-right truncate max-w-[60%]">{value}</dd>
    </div>
  );
}
