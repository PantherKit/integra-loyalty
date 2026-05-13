'use client';

import { useState, useEffect } from 'react';
import { WalletCard, CardConfig } from '@/components/WalletCard';
import { QrCode, Bell, MapPin, Plus, Smartphone, Check } from 'lucide-react';

const baseCard: CardConfig = {
  businessName: 'Café Mérida',
  tagline: 'Tostado de altura',
  color: '#5B3A1F',
  iconKey: 'coffee',
  reward: 'Café gratis',
  stampsRequired: 7,
  customerName: 'María González',
  currentStamps: 3,
};

type Step = 'qr' | 'landing' | 'add' | 'wallet' | 'redeem';

export default function CustomerPage() {
  const [step, setStep] = useState<Step>('qr');
  const [card, setCard] = useState<CardConfig>(baseCard);
  const [showPush, setShowPush] = useState(false);
  const [showGeofence, setShowGeofence] = useState(false);

  const addStamp = () => {
    if (card.currentStamps >= card.stampsRequired) return;
    const newStamps = card.currentStamps + 1;
    setCard({ ...card, currentStamps: newStamps });
    setShowPush(true);
    setTimeout(() => setShowPush(false), 3500);
  };

  const reset = () => {
    setCard(baseCard);
    setStep('qr');
  };

  // Simulate geofence trigger when entering wallet view
  useEffect(() => {
    if (step === 'wallet') {
      const t = setTimeout(() => setShowGeofence(true), 1500);
      const t2 = setTimeout(() => setShowGeofence(false), 6000);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [step]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Journey del cliente final</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Lo que vive un cliente desde que escanea el QR del comercio hasta que canjea su premio.
          </p>
        </div>
        <button
          onClick={reset}
          className="text-sm text-gray-600 hover:text-gray-900 underline-offset-4 hover:underline"
        >
          Reiniciar journey
        </button>
      </div>

      {/* STEP TRACKER */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {(['qr', 'landing', 'add', 'wallet', 'redeem'] as Step[]).map((s, i) => {
          const labels: Record<Step, string> = {
            qr: '1. Escanea QR',
            landing: '2. Landing',
            add: '3. Add to Wallet',
            wallet: '4. Tarjeta activa',
            redeem: '5. Canje',
          };
          const active = step === s;
          const done = (['qr', 'landing', 'add', 'wallet', 'redeem'].indexOf(step)) > i;
          return (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                active
                  ? 'bg-gray-900 text-white border-gray-900'
                  : done
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {done && <Check size={12} className="inline -mt-0.5 mr-1" />}
              {labels[s]}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-8">
        {/* LEFT: Phone-style frame for the active step */}
        <div className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-2xl p-8 grid place-items-center min-h-[560px]">
          <div className="w-72 bg-black rounded-[2.5rem] p-2 wallet-shadow">
            <div className="bg-white rounded-[2rem] overflow-hidden aspect-[9/19]">
              {step === 'qr' && <ScreenQR onNext={() => setStep('landing')} />}
              {step === 'landing' && <ScreenLanding card={card} onNext={() => setStep('add')} />}
              {step === 'add' && <ScreenAdd card={card} onNext={() => setStep('wallet')} />}
              {step === 'wallet' && (
                <ScreenWallet
                  card={card}
                  showPush={showPush}
                  showGeofence={showGeofence}
                  onAddStamp={addStamp}
                  onRedeem={() => setStep('redeem')}
                />
              )}
              {step === 'redeem' && <ScreenRedeem card={card} onReset={reset} />}
            </div>
          </div>
        </div>

        {/* RIGHT: explanation panel */}
        <aside className="space-y-4">
          {step === 'qr' && (
            <Explanation
              title="El QR está en el mostrador"
              body="Cada comercio recibe un QR físico imprimible (sticker, tent card, póster) y un link compartible. El cliente lo escanea desde la cámara del teléfono — sin app, sin login."
              points={['Generación masiva de QRs por Integra', 'Link único por comercio (multi-tenant)', 'No requiere instalar nada']}
            />
          )}
          {step === 'landing' && (
            <Explanation
              title="Landing del comercio"
              body="Una página minimal que se identifica con la marca del comercio. El cliente solo ve los dos botones que importan: Add to Apple Wallet o Add to Google Wallet."
              points={['PWA fallback para clientes sin Wallet', 'Magic-link sin password', 'Branding heredado del editor']}
            />
          )}
          {step === 'add' && (
            <Explanation
              title="Add to Wallet — un tap"
              body="Apple Wallet (PassKit) firma el pase con el certificado del Apple Developer Program de Integra. Google Wallet usa la API de Loyalty Class. Cero fricción."
              points={['Apple PassKit + APNs', 'Google Wallet Loyalty Class', '~3 segundos del tap a tarjeta agregada']}
            />
          )}
          {step === 'wallet' && (
            <Explanation
              title="La tarjeta vive en el Wallet"
              body="Cuando el cliente suma sellos en mostrador, el backend dispara un push update y el Wallet actualiza la tarjeta automáticamente. Notificación push nativa con geofence cuando pasa cerca del comercio."
              points={['Update en tiempo real (APNs / Google push)', 'Geofence al pasar cerca del comercio', 'Visible en lock screen — accesible sin abrir nada']}
            >
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={addStamp}
                  className="bg-gray-900 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-800 inline-flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Simular sello desde el mostrador
                </button>
                {card.currentStamps >= card.stampsRequired && (
                  <button
                    onClick={() => setStep('redeem')}
                    className="bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-green-700"
                  >
                    Canjear premio →
                  </button>
                )}
              </div>
            </Explanation>
          )}
          {step === 'redeem' && (
            <Explanation
              title="Canje del premio"
              body="El cajero escanea el código en la tarjeta, valida y canjea. La tarjeta se reinicia y el cliente recibe un nuevo push: 'Empieza otro ciclo'."
              points={['Canje con código en pantalla del Wallet', 'Backend audita cada canje', 'Tarjeta se renueva automáticamente']}
            />
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Por qué Wallet (no app)</div>
            <ul className="text-sm text-gray-700 space-y-1.5">
              <li>· Cero fricción para el cliente — un tap y listo</li>
              <li>· Push nativo del SO con geofence integrado</li>
              <li>· Se ve premium aunque vendas a comercios pequeños</li>
              <li>· Sin costo de mantenimiento de app móvil</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Explanation({
  title,
  body,
  points,
  children,
}: {
  title: string;
  body: string;
  points: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 card-shadow">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{body}</p>
      <ul className="mt-3 text-sm text-gray-700 space-y-1">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-brand-600 mt-1">·</span> {p}
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

function ScreenQR({ onNext }: { onNext: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white p-6 text-center">
      <div className="bg-white p-3 rounded-xl mb-4">
        <QrCode size={88} className="text-black" />
      </div>
      <p className="text-xs opacity-70 mb-1">Escanea con la cámara</p>
      <p className="font-medium">cafemerida.lealtad.app</p>
      <button
        onClick={onNext}
        className="mt-6 bg-white text-black text-sm font-medium px-5 py-2 rounded-full"
      >
        Simular escaneo
      </button>
    </div>
  );
}

function ScreenLanding({ card, onNext }: { card: CardConfig; onNext: () => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="h-32 grid place-items-center" style={{ background: card.color }}>
        <div className="text-white text-center">
          <div className="text-xs opacity-80 uppercase tracking-wider">{card.tagline}</div>
          <div className="font-semibold text-lg mt-0.5">{card.businessName}</div>
        </div>
      </div>
      <div className="flex-1 p-5 flex flex-col">
        <h3 className="font-semibold text-base">Tu tarjeta de lealtad</h3>
        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
          Acumula {card.stampsRequired} sellos y gana {card.reward.toLowerCase()}. Sin app, en tu Wallet.
        </p>
        <div className="mt-auto space-y-2">
          <button
            onClick={onNext}
            className="w-full bg-black text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
             Add to Apple Wallet
          </button>
          <button
            onClick={onNext}
            className="w-full bg-white border-2 border-gray-900 text-gray-900 rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <span className="text-blue-600 font-bold">G</span> Add to Google Wallet
          </button>
          <button onClick={onNext} className="w-full text-xs text-gray-500 mt-1 underline-offset-4 hover:underline">
            o continuar en el navegador (PWA)
          </button>
        </div>
      </div>
    </div>
  );
}

function ScreenAdd({ card, onNext }: { card: CardConfig; onNext: () => void }) {
  return (
    <div className="h-full bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-3">Apple Wallet</div>
      <div className="scale-90 mb-4">
        <WalletCard config={card} size="sm" />
      </div>
      <p className="text-sm font-medium mb-1">Agregar a Wallet</p>
      <p className="text-xs text-gray-600 mb-5 leading-relaxed">
        La tarjeta de {card.businessName} se agregará a tu Wallet y recibirás avisos cuando estés cerca.
      </p>
      <button
        onClick={onNext}
        className="bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full"
      >
        Agregar
      </button>
    </div>
  );
}

function ScreenWallet({
  card,
  showPush,
  showGeofence,
  onAddStamp,
  onRedeem,
}: {
  card: CardConfig;
  showPush: boolean;
  showGeofence: boolean;
  onAddStamp: () => void;
  onRedeem: () => void;
}) {
  const ready = card.currentStamps >= card.stampsRequired;
  return (
    <div className="h-full bg-gray-100 relative overflow-hidden flex flex-col">
      <div className="bg-black text-white text-[10px] py-1 text-center opacity-90">9:41 · Wallet</div>
      <div className="flex-1 p-4 grid place-items-center">
        <div className="scale-95">
          <WalletCard config={card} size="sm" />
        </div>
      </div>
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Detalles</div>
        <div className="text-xs text-gray-700">{card.currentStamps}/{card.stampsRequired} sellos · {card.reward}</div>
        {ready && (
          <button
            onClick={onRedeem}
            className="mt-2 w-full bg-green-600 text-white rounded-lg py-2 text-xs font-semibold"
          >
            Canjear premio
          </button>
        )}
      </div>

      {/* Push notification overlay */}
      {showPush && (
        <div className="absolute top-7 left-3 right-3 bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg flex items-start gap-2 animate-[slideDown_.3s_ease-out]">
          <div className="w-7 h-7 rounded-md grid place-items-center" style={{ background: card.color }}>
            <Bell size={14} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold leading-tight">{card.businessName}</div>
            <div className="text-[11px] text-gray-700 leading-snug">
              {ready ? '¡Tienes un premio listo! ' + card.reward : `+1 sello · ${card.currentStamps}/${card.stampsRequired}`}
            </div>
          </div>
          <div className="text-[10px] text-gray-400">ahora</div>
        </div>
      )}

      {/* Geofence overlay */}
      {showGeofence && !showPush && (
        <div className="absolute top-7 left-3 right-3 bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg flex items-start gap-2 animate-[slideDown_.3s_ease-out]">
          <div className="w-7 h-7 rounded-md grid place-items-center bg-blue-600">
            <MapPin size={14} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold leading-tight">Estás cerca de {card.businessName}</div>
            <div className="text-[11px] text-gray-700 leading-snug">
              Te faltan {card.stampsRequired - card.currentStamps} sellos para tu {card.reward.toLowerCase()}
            </div>
          </div>
          <div className="text-[10px] text-gray-400">ahora</div>
        </div>
      )}
    </div>
  );
}

function ScreenRedeem({ card, onReset }: { card: CardConfig; onReset: () => void }) {
  return (
    <div className="h-full bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-green-600 grid place-items-center mb-4">
        <Check size={32} className="text-white" />
      </div>
      <h3 className="font-semibold text-lg">¡Premio canjeado!</h3>
      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
        Disfruta tu {card.reward.toLowerCase()} en {card.businessName}.
      </p>
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
        Tu tarjeta se reinicia y empiezas a acumular sellos para el siguiente premio.
      </div>
      <button
        onClick={onReset}
        className="mt-6 bg-black text-white text-sm font-medium px-5 py-2 rounded-full"
      >
        Reiniciar journey
      </button>
    </div>
  );
}
