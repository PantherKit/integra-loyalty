'use client';

import ApplePassPreview from '@/components/ApplePassPreview';

/**
 * Galería de 3 tarjetas demo para mostrar en ventas y onboarding.
 * Usan ApplePassPreview con datos hardcoded representativos de
 * los giros más comunes. Visibles dentro del producto.
 */

const DEMO_PASSES = [
  {
    id: 'cafe',
    label: 'Cafetería',
    merchantName: 'Café Origen',
    bgColor: '#059669',
    stampStyle: 'cup' as const,
    stampsRequired: 8,
    rewardDetail: 'Un café americano gratis',
    stamps: 5,
  },
  {
    id: 'postres',
    label: 'Restaurante / Postres',
    merchantName: 'Marquesitas OMO',
    bgColor: '#d97706',
    stampStyle: 'star' as const,
    stampsRequired: 10,
    rewardDetail: 'Postre de cortesía',
    stamps: 3,
  },
  {
    id: 'salon',
    label: 'Estética / Retail',
    merchantName: 'Studio Belle',
    bgColor: '#7c3aed',
    stampStyle: 'heart' as const,
    stampsRequired: 6,
    rewardDetail: '20% de descuento',
    stamps: 6,
  },
] as const;

interface DemoPassGalleryProps {
  /** Título de la sección. Default: "Así se ve en tu teléfono". */
  title?: string;
  /** Muestra solo una tarjeta activa a la vez con navegación. */
  compact?: boolean;
}

export default function DemoPassGallery({
  title = 'Así se ve en tu teléfono',
  compact = false,
}: DemoPassGalleryProps) {
  if (compact) return <DemoPassGalleryCompact title={title} />;
  return <DemoPassGalleryFull title={title} />;
}

function DemoPassGalleryFull({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-widest text-gray-400 text-center">{title}</p>
      <div className="grid gap-6 sm:grid-cols-3">
        {DEMO_PASSES.map((demo) => (
          <div key={demo.id} className="flex flex-col items-center gap-2">
            <ApplePassPreview
              merchantName={demo.merchantName}
              bgColor={demo.bgColor}
              stampStyle={demo.stampStyle}
              stampsRequired={demo.stampsRequired}
              rewardDetail={demo.rewardDetail}
              stamps={demo.stamps}
            />
            <span className="text-xs text-gray-500 font-medium">{demo.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoPassGalleryCompact({ title }: { title: string }) {
  // Solo mostramos la primera tarjeta en modo compacto para no saturar paneles pequeños.
  const demo = DEMO_PASSES[0];
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-gray-400 text-center">{title}</p>
      <div className="flex justify-center">
        <ApplePassPreview
          merchantName={demo.merchantName}
          bgColor={demo.bgColor}
          stampStyle={demo.stampStyle}
          stampsRequired={demo.stampsRequired}
          rewardDetail={demo.rewardDetail}
          stamps={demo.stamps}
        />
      </div>
      <p className="text-center text-xs text-gray-400">
        {DEMO_PASSES.map((d) => d.label).join(' · ')}
      </p>
    </div>
  );
}
