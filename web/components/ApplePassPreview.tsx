'use client';

import { cn } from '@/lib/cn';

export interface ApplePassPreviewProps {
  merchantName: string;
  /** Color de marca en hex (#rrggbb). */
  brandColor?: string;
  /** Logo del comercio (data URL o http). */
  logoUrl?: string;
  stampsRequired: number;
  rewardDetail: string;
  /** Sellos actuales. */
  stamps?: number;
  className?: string;
}

// MISMO esquema que api/src/lib/applePass.ts (WYSIWYG):
//  - fondo crema rgb(247,246,243)
//  - texto/etiquetas = color de marca (fallback gris oscuro)
//  - grid de sellos: lleno = círculo de marca + palomita blanca; vacío = anillo gris
const CREAM = 'rgb(247, 246, 243)';
const RING = 'rgb(210, 208, 203)';
const FALLBACK_FG = 'rgb(30, 30, 40)';

function validHex(hex?: string): string | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? `#${m[1]}` : null;
}

export default function ApplePassPreview({
  merchantName,
  brandColor,
  logoUrl,
  stampsRequired,
  rewardDetail,
  stamps = 0,
  className,
}: ApplePassPreviewProps) {
  const hex = validHex(brandColor);
  const fg = hex ?? FALLBACK_FG;
  const total = Math.max(1, stampsRequired);
  const filled = Math.min(Math.max(0, stamps), total);
  const complete = stamps >= total;

  const cols = Math.min(5, total);
  const rows = Math.ceil(total / cols);
  // Filas de tokens (la última puede ir incompleta y se centra).
  const tokenRows: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx < total) row.push(idx);
    }
    tokenRows.push(row);
  }

  const initials = merchantName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();

  // tamaño de token proporcional (replica el radius de la strip 375x144)
  const tokenSize = total > 10 ? 30 : total > 5 ? 38 : 46;
  const stroke = Math.max(2, tokenSize * 0.07);

  return (
    <div className={cn('w-full max-w-[340px] select-none', className)}>
      <div
        className="overflow-hidden rounded-[14px] shadow-[0_18px_45px_-18px_rgba(0,0,0,0.45)]"
        style={{ background: CREAM, color: fg }}
      >
        {/* Header: logo + nombre + SELLOS x/N */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div
            className="h-9 w-9 shrink-0 overflow-hidden rounded-[8px] grid place-items-center text-[12px] font-bold"
            style={{ background: '#fff', color: fg, boxShadow: `inset 0 0 0 1px ${RING}` }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={merchantName} className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <p className="flex-1 truncate text-[15px] font-semibold leading-tight">
            {merchantName}
          </p>
          <div className="text-right">
            <p
              className="text-[8.5px] font-semibold uppercase tracking-[0.12em]"
              style={{ opacity: 0.65 }}
            >
              Sellos
            </p>
            <p className="text-[15px] font-semibold tabular-nums leading-tight">
              {filled}/{total}
            </p>
          </div>
        </div>

        {/* STRIP: grid de sellos (réplica fiel de stampStripPng) */}
        <div
          className="flex flex-col items-center justify-center gap-2.5 px-3"
          style={{ background: CREAM, minHeight: 132, paddingTop: 14, paddingBottom: 14 }}
        >
          {complete ? (
            <p className="text-[15px] font-semibold">¡Premio listo! 🎉</p>
          ) : null}
          {tokenRows.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-2.5">
              {row.map((idx) => {
                const isFilled = idx < filled;
                return (
                  <div
                    key={idx}
                    className="grid place-items-center rounded-full"
                    style={{
                      width: tokenSize,
                      height: tokenSize,
                      background: isFilled ? fg : 'transparent',
                      boxShadow: isFilled ? 'none' : `inset 0 0 0 ${stroke}px ${RING}`,
                    }}
                  >
                    {isFilled && (
                      <svg
                        width={tokenSize * 0.5}
                        height={tokenSize * 0.5}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth={3.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M5 12.5l4.2 4.2L19 7" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* secondary / auxiliary: TU PREMIO / NEGOCIO */}
        <div
          className="flex items-start justify-between gap-4 px-4 pt-3 pb-3"
          style={{ borderTop: `1px solid ${RING}` }}
        >
          <div className="min-w-0">
            <p
              className="text-[8.5px] font-semibold uppercase tracking-[0.12em]"
              style={{ opacity: 0.65 }}
            >
              Tu premio
            </p>
            <p className="text-[13px] font-medium leading-snug">{rewardDetail}</p>
          </div>
          <div className="min-w-0 text-right">
            <p
              className="text-[8.5px] font-semibold uppercase tracking-[0.12em]"
              style={{ opacity: 0.65 }}
            >
              Negocio
            </p>
            <p className="truncate text-[13px] font-medium leading-snug">{merchantName}</p>
          </div>
        </div>

        {/* Zona de barcode (placeholder QR) */}
        <div className="flex justify-center bg-white px-4 py-4">
          <div
            className="grid place-items-center rounded-[6px]"
            style={{
              width: 92,
              height: 92,
              backgroundImage:
                'repeating-conic-gradient(#111 0% 25%, #fff 0% 50%)',
              backgroundSize: '14px 14px',
              opacity: 0.85,
            }}
            aria-label="Código QR de la tarjeta"
          />
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-gray-400">
        Vista fiel del pase real (Apple aplica color plano).
      </p>
    </div>
  );
}
