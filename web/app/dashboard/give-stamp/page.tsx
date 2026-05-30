'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Plus,
  Gift,
  AlertCircle,
  CheckCircle2,
  ScanLine,
  Camera,
  QrCode as QrIcon,
} from 'lucide-react';
import LoyaltyPass from '@/components/LoyaltyPass';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useDashboard } from '@/components/dashboard-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_STAMPS_REQUIRED } from '@/lib/constants';
import {
  lookupCardsByPhone,
  getCard,
  stampCard,
  redeemCardApi,
  listMyPrograms,
  isSubscriptionRequired,
  type Card as LoyaltyCard,
  type LoyaltyProgram,
} from '@/lib/api';

const PAYWALL_MSG =
  'Tu prueba terminó o tu suscripción no está activa. Suscríbete para seguir dando sellos.';

function errMsg(e: unknown, fallback: string): string {
  if (isSubscriptionRequired(e)) return PAYWALL_MSG;
  const body = (e as { body?: { error?: string; hint?: string } })?.body;
  return body?.hint ?? body?.error ?? fallback;
}

function GiveStampInner() {
  const { merchant } = useDashboard();
  const searchParams = useSearchParams();
  const cardParam = searchParams.get('card');
  const [phone, setPhone] = useState('+52');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paywalled, setPaywalled] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [redeemTarget, setRedeemTarget] = useState<LoyaltyCard | null>(null);

  useEffect(() => {
    listMyPrograms()
      .then((r) => setPrograms(r.items))
      .catch(() => {});
  }, []);

  // Llega por escaneo del QR del cliente: ?card=<id> → carga esa tarjeta.
  useEffect(() => {
    if (!cardParam) return;
    setSearching(true);
    setError(null);
    getCard(cardParam)
      .then((c) => {
        setCards([c]);
        setSearched(true);
      })
      .catch(() =>
        setError('No encontramos esa tarjeta. Pídele al cliente que la abra de nuevo.')
      )
      .finally(() => setSearching(false));
  }, [cardParam]);

  function programOf(card: LoyaltyCard): LoyaltyProgram | undefined {
    return programs.find((p) => p.programId === card.programId);
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPaywalled(false);
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
    setPaywalled(false);
    setNotice(null);
    try {
      const result = await stampCard(cardId, 1);
      setCards((prev) =>
        prev.map((c) => (c.cardId === cardId ? result.card : c))
      );
      setNotice('Sello agregado correctamente.');
    } catch (e) {
      setPaywalled(isSubscriptionRequired(e));
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
    setPaywalled(false);
    setNotice(null);
    try {
      const result = await redeemCardApi(cardId);
      setCards((prev) =>
        prev.map((c) => (c.cardId === cardId ? result.card : c))
      );
      setNotice('Premio canjeado. Entrega la recompensa al cliente.');
      setRedeemTarget(null);
    } catch (e) {
      setPaywalled(isSubscriptionRequired(e));
      setError(errMsg(e, 'No se pudo canjear el premio.'));
      setRedeemTarget(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Atención en mostrador
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
          Dar sello o canjear
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dale sello a la tarjeta del cliente o entrégale su premio.
        </p>
      </header>

      {cardParam ? (
        <Alert variant="loyalty">
          <CheckCircle2 size={16} className="shrink-0" />
          <AlertDescription>
            Tarjeta cargada desde el QR del cliente. Solo dale “Dar sello”.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base">Cómo dar un sello</CardTitle>
          </CardHeader>
          <CardContent>
          <ol className="space-y-2.5 text-sm text-foreground">
            <li className="flex gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-lg border bg-background text-xs font-medium text-muted-foreground">
                1
              </span>
              Pídele al cliente que abra su tarjeta y te muestre su{' '}
              <span className="inline-flex items-center gap-1 font-medium">
                <QrIcon size={13} /> código QR
              </span>
              .
            </li>
            <li className="flex gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-lg border bg-background text-xs font-medium text-muted-foreground">
                2
              </span>
              <span className="inline-flex items-center gap-1">
                <Camera size={14} /> Escanéalo con la cámara de tu celular
              </span>
              — se abre aquí con su tarjeta lista.
            </li>
            <li className="flex gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-lg border bg-background text-xs font-medium text-muted-foreground">
                3
              </span>
              Toca <span className="font-medium">“Dar sello”</span>. Su tarjeta
              se actualiza sola.
            </li>
          </ol>
          <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
            ¿No trae el QR a la mano? Búscalo por su teléfono abajo.
          </p>
          </CardContent>
        </Card>
      )}

      <form
        onSubmit={onSearch}
        className="rounded-2xl border bg-card p-4 text-card-foreground"
      >
        <div>
          <Label htmlFor="customer-phone">Teléfono del cliente</Label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <Input
              id="customer-phone"
              required
              type="tel"
              inputMode="tel"
              pattern="^\+\d{10,15}$"
              aria-describedby="customer-phone-help"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+5219991234567"
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              disabled={searching}
              variant="loyalty"
              className="shrink-0"
            >
              <Search size={15} /> {searching ? 'Buscando…' : 'Buscar'}
            </Button>
          </div>
        </div>
        <span id="customer-phone-help" className="mt-1.5 block text-xs text-muted-foreground">
          Formato internacional con +52 y sin espacios.
        </span>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <AlertDescription className="space-y-2">
            <span>{error}</span>
            {paywalled && (
              <div>
                <Button asChild size="sm" variant="destructive">
                  <Link href="/dashboard/suscribirse/">
                    Ver planes y suscribirme
                  </Link>
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert variant="success">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {searched && cards.length === 0 && !error && (
        <Card>
          <CardContent className="p-6 text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <ScanLine size={20} />
          </div>
          <p className="text-sm font-medium text-foreground">
            Sin tarjetas para este teléfono
          </p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Pídele al cliente que se registre escaneando tu código QR o abriendo
            tu enlace público.
          </p>
            <Button asChild variant="outline" className="mt-4">
            <Link href="/dashboard/share/">Ver cómo compartir</Link>
          </Button>
          </CardContent>
        </Card>
      )}

      {cards.length > 0 && (
        <ul className="space-y-6">
          {cards.map((card) => {
            const program = programOf(card);
            const required = program?.stampsRequired ?? DEFAULT_STAMPS_REQUIRED;
            const complete = card.stamps >= required;
            const isBusy = busy === card.cardId;

            return (
              <li key={card.cardId} className="space-y-4">
                <div className="flex justify-center">
                  <LoyaltyPass
                    variant="live"
                    merchantName={merchant?.name ?? 'Tu comercio'}
                    brandColor={merchant?.brandColor ?? '#4361ee'}
                    tagline={merchant?.industry}
                    logoUrl={merchant?.logoUrl}
                    stampStyle={merchant?.stampStyle}
                    programName={program?.name ?? 'Programa de lealtad'}
                    stampsRequired={required}
                    rewardDetail={program?.rewardDetail ?? 'Recompensa'}
                    stamps={card.stamps}
                    cardId={card.cardId}
                    customerPhone={card.customerPhone}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => onStamp(card.cardId)}
                    disabled={isBusy || complete}
                    variant="loyalty"
                    className="h-12 flex-1"
                  >
                    <Plus size={16} />
                    {isBusy && !redeemTarget ? 'Sellando…' : 'Dar sello'}
                  </Button>
                  {complete && (
                    <Button
                      onClick={() => setRedeemTarget(card)}
                      disabled={isBusy}
                      variant="warning"
                      className="h-12 flex-1"
                    >
                      <Gift size={16} /> Canjear premio
                    </Button>
                  )}
                </div>

                {complete && (
                  <p className="text-center text-xs text-muted-foreground">
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
              }. Confirma solo cuando ya tengas el premio listo: esta acción reinicia los sellos y no se puede deshacer.`
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

export default function GiveStampPage() {
  return (
    <Suspense
      fallback={<div className="text-sm text-muted-foreground">Cargando…</div>}
    >
      <GiveStampInner />
    </Suspense>
  );
}
