'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Gift, AlertCircle, CheckCircle2, ScanLine } from 'lucide-react';
import LoyaltyPass from '@/components/LoyaltyPass';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useDashboard } from '@/components/dashboard-context';
import {
  lookupCardsByPhone,
  stampCard,
  redeemCardApi,
  listMyPrograms,
  type Card,
  type LoyaltyProgram,
} from '@/lib/api';

function errMsg(e: unknown, fallback: string): string {
  const body = (e as { body?: { error?: string; hint?: string } })?.body;
  return body?.hint ?? body?.error ?? fallback;
}

export default function GiveStampPage() {
  const { merchant } = useDashboard();
  const [phone, setPhone] = useState('+52');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [redeemTarget, setRedeemTarget] = useState<Card | null>(null);

  useEffect(() => {
    listMyPrograms()
      .then((r) => setPrograms(r.items))
      .catch(() => {});
  }, []);

  function programOf(card: Card): LoyaltyProgram | undefined {
    return programs.find((p) => p.programId === card.programId);
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSearching(true);
    setSearched(false);
    setCards([]);
    try {
      const result = await lookupCardsByPhone(phone);
      setCards(result.items);
      setSearched(true);
    } catch (e) {
      setError(errMsg(e, 'No pudimos buscar ese teléfono. Intenta de nuevo.'));
    } finally {
      setSearching(false);
    }
  }

  async function onStamp(cardId: string) {
    setBusy(cardId);
    setError(null);
    setNotice(null);
    try {
      const result = await stampCard(cardId, 1);
      setCards((prev) =>
        prev.map((c) => (c.cardId === cardId ? result.card : c))
      );
      setNotice('Sello agregado correctamente.');
    } catch (e) {
      setError(errMsg(e, 'No se pudo dar el sello.'));
    } finally {
      setBusy(null);
    }
  }

  async function confirmRedeem() {
    if (!redeemTarget) return;
    const cardId = redeemTarget.cardId;
    setBusy(cardId);
    setError(null);
    setNotice(null);
    try {
      const result = await redeemCardApi(cardId);
      setCards((prev) =>
        prev.map((c) => (c.cardId === cardId ? result.card : c))
      );
      setNotice('Premio canjeado. Entrega la recompensa al cliente.');
      setRedeemTarget(null);
    } catch (e) {
      setError(errMsg(e, 'No se pudo canjear el premio.'));
      setRedeemTarget(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Atención en mostrador
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">
          Dar sello o canjear
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Busca al cliente por su teléfono para sellar su tarjeta o entregar su
          premio.
        </p>
      </header>

      <form
        onSubmit={onSearch}
        className="rounded-xl border border-gray-200 bg-white p-5"
      >
        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Teléfono del cliente
          </span>
          <div className="mt-1.5 flex gap-2">
            <input
              required
              type="tel"
              inputMode="tel"
              pattern="^\+\d{10,15}$"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+5219991234567"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Search size={15} /> {searching ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
        </label>
        <span className="mt-1.5 block text-xs text-gray-500">
          Formato internacional con +52 y sin espacios.
        </span>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {searched && cards.length === 0 && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gray-100 text-gray-400">
            <ScanLine size={20} />
          </div>
          <p className="text-sm font-medium text-gray-700">
            Sin tarjetas para este teléfono
          </p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
            Pídele al cliente que se registre escaneando tu código QR o abriendo
            tu enlace público.
          </p>
          <Link
            href="/dashboard/share/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            Ver cómo compartir
          </Link>
        </div>
      )}

      {cards.length > 0 && (
        <ul className="space-y-6">
          {cards.map((card) => {
            const program = programOf(card);
            const required = program?.stampsRequired ?? 7;
            const complete = card.stamps >= required;
            const isBusy = busy === card.cardId;

            return (
              <li key={card.cardId} className="space-y-4">
                <div className="flex justify-center">
                  <LoyaltyPass
                    variant="live"
                    merchantName={merchant?.name ?? 'Tu comercio'}
                    brandColor={merchant?.brandColor ?? '#4f46e5'}
                    tagline={merchant?.industry}
                    programName={program?.name ?? 'Programa de lealtad'}
                    stampsRequired={required}
                    rewardDetail={program?.rewardDetail ?? 'Recompensa'}
                    stamps={card.stamps}
                    cardId={card.cardId}
                    customerPhone={card.customerPhone}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onStamp(card.cardId)}
                    disabled={isBusy || complete}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    <Plus size={16} />
                    {isBusy && !redeemTarget ? 'Sellando…' : 'Dar sello'}
                  </button>
                  {complete && (
                    <button
                      onClick={() => setRedeemTarget(card)}
                      disabled={isBusy}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-3 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      <Gift size={16} /> Canjear premio
                    </button>
                  )}
                </div>

                {complete && (
                  <p className="text-center text-xs text-gray-500">
                    La tarjeta está completa. Al canjear, los sellos se
                    reinician.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={redeemTarget !== null}
        title="¿Confirmar canje del premio?"
        description={
          redeemTarget
            ? `Vas a entregar la recompensa a ${
                redeemTarget.customerPhone ?? 'este cliente'
              }. Esta acción reinicia los sellos de su tarjeta y no se puede deshacer.`
            : undefined
        }
        confirmLabel="Sí, canjear"
        cancelLabel="Cancelar"
        tone="amber"
        busy={busy !== null && redeemTarget !== null}
        onConfirm={confirmRedeem}
        onCancel={() => {
          if (busy === null) setRedeemTarget(null);
        }}
      />
    </div>
  );
}
