'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Plus, Award, Gift, User as UserIcon } from 'lucide-react';
import {
  getToken,
  lookupCardsByPhone,
  stampCard,
  redeemCardApi,
  listMyPrograms,
  type Card,
  type LoyaltyProgram,
} from '@/lib/api';

export default function GiveStampPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+52');
  const [searching, setSearching] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // cardId currently being updated

  useEffect(() => {
    if (!getToken()) { router.push('/login/'); return; }
    listMyPrograms().then((r) => setPrograms(r.items)).catch(() => {});
  }, [router]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSearching(true);
    setCards([]);
    try {
      const result = await lookupCardsByPhone(phone);
      setCards(result.items);
      if (result.items.length === 0) setError('Sin tarjetas para este teléfono. Pídele al cliente que se registre en tu link público.');
    } catch (e: any) {
      const body = e?.body as { error?: string; hint?: string };
      setError(body?.hint ?? body?.error ?? 'Error al buscar.');
    } finally {
      setSearching(false);
    }
  }

  async function onStamp(cardId: string) {
    setBusy(cardId);
    setError(null);
    try {
      const result = await stampCard(cardId, 1);
      setCards((prev) => prev.map((c) => (c.cardId === cardId ? result.card : c)));
    } catch (e: any) {
      setError(e?.body?.hint ?? e?.body?.error ?? 'Error al dar sello.');
    } finally {
      setBusy(null);
    }
  }

  async function onRedeem(cardId: string) {
    if (!confirm('¿Confirmas el canje del premio?')) return;
    setBusy(cardId);
    setError(null);
    try {
      const result = await redeemCardApi(cardId);
      setCards((prev) => prev.map((c) => (c.cardId === cardId ? result.card : c)));
    } catch (e: any) {
      setError(e?.body?.hint ?? e?.body?.error ?? 'Error al canjear.');
    } finally {
      setBusy(null);
    }
  }

  function programOf(card: Card): LoyaltyProgram | undefined {
    return programs.find((p) => p.programId === card.programId);
  }

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard/" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"><ArrowLeft size={14} /> Dashboard</Link>
          <span className="font-semibold tracking-tight ml-2">Dar sellos / canjear</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <form onSubmit={onSearch} className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Teléfono del cliente</span>
            <div className="flex gap-2 mt-1">
              <input
                required
                type="tel"
                pattern="^\+\d{10,15}$"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+5219991234567"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-brand-500"
              />
              <button type="submit" disabled={searching} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5">
                <Search size={14} /> {searching ? '…' : 'Buscar'}
              </button>
            </div>
          </label>
          <span className="text-xs text-gray-500 mt-1 block">Formato E.164 (con +52, sin espacios)</span>
        </form>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

        {cards.length > 0 && (
          <ul className="space-y-3">
            {cards.map((card) => {
              const program = programOf(card);
              const required = program?.stampsRequired ?? 7;
              const complete = card.stamps >= required;
              const isBusy = busy === card.cardId;

              return (
                <li key={card.cardId} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><UserIcon size={18} /></div>
                    <div className="flex-1">
                      <div className="font-medium">{card.customerPhone}</div>
                      <div className="text-xs text-gray-500">{program?.name ?? '(sin programa)'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold tracking-tight">{card.stamps}<span className="text-base text-gray-400">/{required}</span></div>
                      <div className="text-xs text-gray-500">sellos</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {Array.from({ length: required }).map((_, i) => (
                      <div key={i} className={`w-7 h-7 rounded-full grid place-items-center ${i < card.stamps ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-300'}`}>
                        {i < card.stamps && <Award size={14} />}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onStamp(card.cardId)}
                      disabled={isBusy || complete}
                      className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Dar sello
                    </button>
                    {complete && (
                      <button
                        onClick={() => onRedeem(card.cardId)}
                        disabled={isBusy}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium inline-flex items-center justify-center gap-1.5"
                      >
                        <Gift size={14} /> Canjear premio
                      </button>
                    )}
                  </div>

                  {program && <p className="text-xs text-gray-500 mt-3">Premio: <span className="font-medium text-gray-700">{program.rewardDetail}</span></p>}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
