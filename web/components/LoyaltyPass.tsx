'use client';

import ApplePassPreview from '@/components/ApplePassPreview';
import type { StampStyle } from '@/lib/api';

export interface LoyaltyPassProps {
  merchantName: string;
  /** Color de marca en hex (#rrggbb). */
  brandColor?: string;
  /** Texto bajo el nombre (giro/lema) — ignorado: Apple Wallet no lo muestra. */
  tagline?: string;
  /** Iniciales si no hay logo — ignorado: ApplePassPreview deriva de merchantName. */
  logoText?: string;
  /** Logo del comercio (data URL o http). */
  logoUrl?: string;
  /** Nombre del programa — ignorado: Apple Wallet no lo muestra. */
  programName?: string;
  stampsRequired: number;
  rewardDetail: string;
  /** Sellos actuales (0 en preview). */
  stamps?: number;
  /** Id de tarjeta. Si está presente se renderiza el QR real + hex code. */
  cardId?: string;
  customerName?: string;
  customerPhone?: string;
  /** 'live' o 'preview' — solo afecta qué valor lleva el QR. */
  variant?: 'live' | 'preview';
  /** Estilo del sello (filled). Default 'disc' (igual que Apple Wallet). */
  stampStyle?: StampStyle;
  className?: string;
}

export default function LoyaltyPass({
  merchantName,
  brandColor,
  logoUrl,
  stampsRequired,
  rewardDetail,
  stamps = 0,
  cardId,
  variant = 'live',
  stampStyle,
  className,
}: LoyaltyPassProps) {
  const qrValue =
    variant === 'live' && cardId
      ? (typeof window !== 'undefined' ? window.location.origin : '') +
        `/dashboard/give-stamp/?card=${cardId}`
      : undefined;

  return (
    <ApplePassPreview
      merchantName={merchantName}
      bgColor={brandColor}
      logoUrl={logoUrl}
      stampStyle={stampStyle}
      stampsRequired={stampsRequired}
      rewardDetail={rewardDetail}
      stamps={stamps}
      qrValue={qrValue}
      qrAltText={cardId ? cardId.replace(/[^0-9a-fA-F]/g, '').slice(-8).toUpperCase() : undefined}
      className={className}
    />
  );
}
