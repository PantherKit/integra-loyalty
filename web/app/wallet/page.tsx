'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Award, Smartphone } from 'lucide-react';
import { getCard, type Card } from '@/lib/api';

function WalletCardContent() {
  const searchParams = useSearchParams();
  const cardId = searchParams.get('id') ?? '';

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) { setError('Falta el id de la tarjeta.'); setLoading(false); return; }
    getCard(cardId)
      .then(setCard)
      .catch(() => setError('No encontramos esta tarjeta.'))
      .finally(() => setLoading(false));
  }, [cardId]);

  if (loading) return <div className="text-gray-500">Cargando…</div>;
  if (error || !card) return <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">{error ?? 'No encontrada'}</div>;

  const totalStampsForReward = 7; // TODO Slice 2B: leer del program

  return (
    <div className="w-full max-w-md">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs uppercase tracking-widest opacity-70">Tarjeta de lealtad</p>
          <div className="w-8 h-8 rounded-full bg-white/20 grid place-items-center"><Award size={16} /></div>
        </div>

        <div className="mb-6">
          <p className="text-xs opacity-70">Tu progreso</p>
          <p className="text-4xl font-semibold tracking-tight">{card.stamps}<span className="text-2xl opacity-70"> / {totalStampsForReward}</span></p>
          <p className="text-xs opacity-70 mt-1">sellos acumulados</p>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {Array.from({ length: totalStampsForReward }).map((_, i) => (
            <div key={i} className={`w-7 h-7 rounded-full grid place-items-center ${i < card.stamps ? 'bg-white text-indigo-700' : 'bg-white/10 text-white/30'}`}>
              {i < card.stamps && <Award size={14} />}
            </div>
          ))}
        </div>

        <div className="border-t border-white/20 pt-4 text-xs opacity-70 flex justify-between">
          <span>Tel: {card.customerPhone}</span>
          <span>ID: {card.cardId.slice(0, 8)}…</span>
        </div>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <Smartphone size={16} className="mt-0.5 flex-shrink-0 text-brand-600" />
          <div>
            <p className="font-medium text-gray-900 mb-0.5">Esta es tu tarjeta digital</p>
            <p className="text-xs">Muestra esta pantalla al comercio al pagar para acumular sellos. En la próxima actualización podrás agregarla a Apple Wallet o Google Wallet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <main className="flex-1 grid place-items-center px-4 py-12 bg-gradient-to-br from-indigo-50 to-amber-50">
      <Suspense fallback={<div className="text-gray-500">Cargando…</div>}>
        <WalletCardContent />
      </Suspense>
    </main>
  );
}
