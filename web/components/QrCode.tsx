'use client';

import { useMemo } from 'react';
import QRCode from 'qrcode';

export interface QrCodeProps {
  value: string;
  /** Tamaño en píxeles del lado del SVG. */
  size?: number;
  className?: string;
  /** Color de los módulos oscuros. */
  fg?: string;
  bg?: string;
}

/**
 * QR escaneable. Usa la librería `qrcode` (Reed-Solomon, máscaras y
 * format/version info probados) y renderiza un SVG nítido y escalable.
 * Reemplazó un encoder hecho a mano que producía códigos ilegibles.
 */
export default function QrCode({
  value,
  size = 220,
  className,
  fg = '#0f0d0a',
  bg = '#ffffff',
}: QrCodeProps) {
  const path = useMemo(() => {
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
      const n = qr.modules.size;
      const data = qr.modules.data;
      let d = '';
      for (let r = 0; r < n; r++) {
        for (let col = 0; col < n; col++) {
          if (data[r * n + col]) d += `M${col} ${r}h1v1h-1z`;
        }
      }
      return { d, n };
    } catch {
      return null;
    }
  }, [value]);

  if (!path) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        role="img"
        aria-label="No se pudo generar el código QR"
      />
    );
  }

  const quiet = 2; // zona de silencio (módulos)
  const vb = path.n + quiet * 2;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${vb} ${vb}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Código QR para darte de alta"
    >
      <rect width={vb} height={vb} fill={bg} />
      <g transform={`translate(${quiet} ${quiet})`} fill={fg}>
        <path d={path.d} />
      </g>
    </svg>
  );
}
