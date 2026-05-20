'use client';

import { cn } from '@/lib/cn';
import type { StampStyle } from '@/lib/api';

export interface ApplePassPreviewProps {
  merchantName: string;
  /**
   * Color de FONDO del pase en hex (#rrggbb) — el que elige el comercio.
   * NO es crema fija: crema solo si no hay color.
   */
  bgColor?: string;
  /** Logo del comercio (data URL o http). */
  logoUrl?: string;
  /** Estilo del sello del grid. Default: 'logo' si hay logo, si no 'disc'. */
  stampStyle?: StampStyle;
  stampsRequired: number;
  rewardDetail: string;
  /** Sellos actuales. */
  stamps?: number;
  className?: string;
}

// WYSIWYG con api/src/lib/applePass.ts:
//  - fondo = color elegido (crema rgb(247,246,243) solo como fallback)
//  - texto/etiquetas = contraste calculado sobre el fondo
//  - grid de sellos: lleno = forma elegida en tinta de contraste; vacío =
//    anillo tenue de la misma tinta
const CREAM = 'rgb(247, 246, 243)';

function validHex(hex?: string): string | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? `#${m[1]}` : null;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** Mismo umbral que contrastOn() del backend. */
function contrastInk(rgb: [number, number, number]): string {
  const L = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return L > 0.62 ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)';
}

/** SVG de la forma del sello, replicando las primitivas del backend. */
function StampShape({
  style,
  size,
  ink,
  bg,
  logoUrl,
}: {
  style: StampStyle;
  size: number;
  ink: string;
  bg: string;
  logoUrl?: string;
}) {
  const r = size / 2;
  if (style === 'logo' && logoUrl) {
    return (
      <div
        className="overflow-hidden rounded-full"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-cover"
          aria-hidden
        />
      </div>
    );
  }
  if (style === 'star') {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.42;
      pts.push(`${r + Math.cos(ang) * rad},${r + Math.sin(ang) * rad}`);
    }
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <polygon points={pts.join(' ')} fill={ink} />
      </svg>
    );
  }
  if (style === 'heart') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <path
          d="M16 28 C16 28 3 19.5 3 11 C3 6.5 6.5 4 10 4 C12.8 4 15 5.8 16 8 C17 5.8 19.2 4 22 4 C25.5 4 29 6.5 29 11 C29 19.5 16 28 16 28 Z"
          fill={ink}
        />
      </svg>
    );
  }
  if (style === 'cup') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <path d="M7 9 H23 L20 26 H10 Z" fill={ink} />
        <path
          d="M23 11 a5 5 0 0 1 0 9"
          stroke={ink}
          strokeWidth={2.6}
          fill="none"
        />
        <path
          d="M13 6 L14.5 2 M18 6 L19.5 2"
          stroke={ink}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // disc + check (y fallback): círculo lleno + palomita en color de fondo.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx={16} cy={16} r={15} fill={ink} />
      <path
        d="M9 16.5 l4.4 4.4 L24 10"
        stroke={bg}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default function ApplePassPreview({
  merchantName,
  bgColor,
  logoUrl,
  stampStyle,
  stampsRequired,
  rewardDetail,
  stamps = 0,
  className,
}: ApplePassPreviewProps) {
  const hex = validHex(bgColor);
  const bg = hex ? `rgb(${hexToRgb(hex).join(', ')})` : CREAM;
  const bgRgb = hex ? hexToRgb(hex) : ([247, 246, 243] as [number, number, number]);
  const ink = contrastInk(bgRgb);
  const ringColor = ink === 'rgb(17, 24, 39)' ? 'rgba(17,24,39,0.32)' : 'rgba(255,255,255,0.32)';

  const effectiveStyle: StampStyle = stampStyle ?? (logoUrl ? 'logo' : 'disc');
  const total = Math.max(1, stampsRequired);
  const filled = Math.min(Math.max(0, stamps), total);
  const complete = stamps >= total;

  const cols = Math.min(5, total);
  const rows = Math.ceil(total / cols);
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

  const tokenSize = total > 10 ? 30 : total > 5 ? 38 : 46;
  const stroke = Math.max(2, tokenSize * 0.07);

  return (
    <div className={cn('w-full max-w-[340px] select-none', className)}>
      <div
        className="overflow-hidden rounded-[14px] shadow-[0_18px_45px_-18px_rgba(0,0,0,0.45)]"
        style={{ background: bg, color: ink }}
      >
        {/* Header: logo + nombre + SELLOS x/N */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div
            className="h-9 w-9 shrink-0 overflow-hidden rounded-[8px] grid place-items-center text-[12px] font-bold"
            style={{ background: '#fff', color: '#111', boxShadow: `inset 0 0 0 1px ${ringColor}` }}
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
          style={{ background: bg, minHeight: 132, paddingTop: 14, paddingBottom: 14 }}
        >
          {complete ? (
            <p className="text-[15px] font-semibold">¡Premio listo! 🎉</p>
          ) : null}
          {tokenRows.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-2.5">
              {row.map((idx) => {
                const isFilled = idx < filled;
                if (isFilled) {
                  return (
                    <div
                      key={idx}
                      className="grid place-items-center"
                      style={{ width: tokenSize, height: tokenSize }}
                    >
                      <StampShape
                        style={effectiveStyle}
                        size={tokenSize}
                        ink={ink}
                        bg={bg}
                        logoUrl={logoUrl}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={idx}
                    className="grid place-items-center rounded-full"
                    style={{
                      width: tokenSize,
                      height: tokenSize,
                      boxShadow: `inset 0 0 0 ${stroke}px ${ringColor}`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* secondary / auxiliary: TU PREMIO / NEGOCIO */}
        <div
          className="flex items-start justify-between gap-4 px-4 pt-3 pb-3"
          style={{ borderTop: `1px solid ${ringColor}` }}
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
