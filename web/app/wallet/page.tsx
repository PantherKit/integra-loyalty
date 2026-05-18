'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import {
  getCard,
  getPublicMerchant,
  type Card,
  type PublicMerchant,
} from '@/lib/api';
import LoyaltyPass from '@/components/LoyaltyPass';
import AddToWalletButtons from '@/components/AddToWalletButtons';

function WalletCardContent() {
  const sp = useSearchParams();
  const cardId = sp.get('id') ?? '';
  const slug = sp.get('s') ?? '';

  const [card, setCard] = useState<Card | null>(null);
  const [pm, setPm] = useState<PublicMerchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const fetchCard = useCallback(async () => {
    if (!cardId) return;
    setRefreshing(true);
    try {
      const next = await getCard(cardId);
      setCard((prev) => {
        if (prev && prev.stamps !== next.stamps) setPulse(true);
        return next;
      });
      setError(null);
    } catch {
      setError('No encontramos esta tarjeta.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    if (!cardId) {
      setError('Falta el id de la tarjeta.');
      setLoading(false);
      return;
    }
    fetchCard();
    if (slug) getPublicMerchant(slug).then(setPm).catch(() => {});

    const onFocus = () => fetchCard();
    window.addEventListener('focus', onFocus);
    // Polling de respaldo (cuando exista Wallet nativo, el push lo reemplaza).
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(fetchCard, 25_000);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVis = () => (document.hidden ? stop() : (fetchCard(), start()));
    document.addEventListener('visibilitychange', onVis);
    if (!document.hidden) start();

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [cardId, slug, fetchCard]);

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [pulse]);

  if (loading)
    return (
      <div className="w-full max-w-sm">
        <div className="h-[360px] rounded-[26px] bg-gray-200 animate-pulse" />
      </div>
    );
  if (error || !card)
    return (
      <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
        {error ?? 'No encontrada'}
      </div>
    );

  const brandColor = pm?.merchant.brandColor ?? '#4f46e5';
  const merchantName = pm?.merchant.name ?? 'Tu comercio';
  const stampsRequired = pm?.program?.stampsRequired ?? Math.max(card.stamps, 8);
  const rewardDetail = pm?.program?.rewardDetail ?? 'Premio de lealtad';
  const programName = pm?.program?.name ?? 'Programa de lealtad';

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">Tu tarjeta</p>
        <button
          onClick={fetchCard}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900"
          aria-label="Actualizar"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className={`transition-transform duration-300 ${pulse ? 'scale-[1.03]' : ''}`}>
        <LoyaltyPass
          merchantName={merchantName}
          brandColor={brandColor}
          tagline={pm?.merchant.industry}
          programName={programName}
          stampsRequired={stampsRequired}
          rewardDetail={rewardDetail}
          stamps={card.stamps}
          cardId={card.cardId}
          customerPhone={card.customerPhone}
          variant="live"
        />
      </div>

      <div className="mt-5">
        <AddToWalletButtons />
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-gray-500">
        <ShieldCheck size={13} className="mt-0.5 flex-shrink-0 text-brand-600" />
        Muestra esta pantalla en el mostrador para acumular sellos. Se actualiza
        sola; funciona aunque pierdas señal un momento.
      </p>
    </div>
  );
}

export default function WalletPage() {
  return (
    <main className="flex-1 grid place-items-center px-4 py-10 bg-gradient-to-b from-gray-50 to-gray-100">
      <Suspense fallback={<div className="text-gray-500">Cargando…</div>}>
        <WalletCardContent />
      </Suspense>
    </main>
  );
}
