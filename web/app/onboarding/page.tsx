'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  GripVertical,
  Palette,
  Gift,
  ArrowRight,
  ArrowLeft,
  Copy,
  ImagePlus,
  LogIn,
} from 'lucide-react';
import {
  signup,
  updateMyMerchant,
  createProgram,
  getMyMerchant,
  type StampStyle,
} from '@/lib/api';
import ApplePassPreview from '@/components/ApplePassPreview';
import LogoCropper from '@/components/LogoCropper';
import QrCode from '@/components/QrCode';
import { cn } from '@/lib/cn';

const COLORS = [
  '#4f46e5', '#0ea5e9', '#059669', '#d97706',
  '#dc2626', '#db2777', '#7c3aed', '#111827',
];
// Estilos de sello disponibles. 'logo' usa el logo recortado en círculo.
const STAMP_STYLES: { v: StampStyle; l: string; glyph: string }[] = [
  { v: 'logo', l: 'Logo', glyph: '🏷️' },
  { v: 'disc', l: 'Círculo', glyph: '●' },
  { v: 'star', l: 'Estrella', glyph: '★' },
  { v: 'heart', l: 'Corazón', glyph: '♥' },
  { v: 'cup', l: 'Café', glyph: '☕' },
  { v: 'check', l: 'Palomita', glyph: '✓' },
];
const REWARDS = [
  'Un café gratis',
  'Postre de cortesía',
  '20% de descuento',
  '2x1 en bebidas',
  'Producto gratis',
];
// value = enum que espera la API; label = lo que ve el comercio.
const INDUSTRIES = [
  { v: 'cafe', l: 'Cafetería' },
  { v: 'restaurant', l: 'Restaurante' },
  { v: 'salon', l: 'Estética' },
  { v: 'retail', l: 'Tienda' },
  { v: 'other', l: 'Otro' },
] as const;

/** Lee un File como data URL (PNG/JPG). Lo pasamos al cropper, que es el que
 *  decide el recorte final y produce el 60x60 que se guarda. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('no_image'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_error'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<string>('cafe');
  const [color, setColor] = useState(COLORS[0]);
  const [logoText, setLogoText] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [pendingLogoSrc, setPendingLogoSrc] = useState<string | null>(null);
  // null = sin elección explícita → default dinámico ('logo' si hay logo, si no 'disc').
  const [stampPick, setStampPick] = useState<StampStyle | null>(null);
  const stampStyle: StampStyle = stampPick ?? (logoUrl ? 'logo' : 'disc');
  const [reward, setReward] = useState(REWARDS[0]);
  const [stamps, setStamps] = useState(8);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canDesign = name.trim().length >= 2;

  async function finish() {
    setError(null);
    setEmailExists(false);
    setBusy(true);
    try {
      await signup({ email, password, merchantName: name.trim(), industry });
      await updateMyMerchant({ brandColor: color, logoUrl, stampStyle });
      await createProgram({
        name: `Tarjeta de ${name.trim()}`,
        description: `Acumula sellos en ${name.trim()}`,
        stampsRequired: stamps,
        rewardType: 'free_item',
        rewardDetail: reward,
      });
      const me = await getMyMerchant();
      const url = `${window.location.origin}/c/?s=${encodeURIComponent(me.slug)}`;
      setShareUrl(url);
      setStep(4);
    } catch (e: unknown) {
      const body = (e as { body?: { error?: string } })?.body;
      if (body?.error === 'email_already_registered') {
        setEmailExists(true);
        setError('Ese correo ya tiene una cuenta.');
      } else setError('No pudimos crear la cuenta. Revisa tus datos e intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }


  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Crea tu tarjeta de lealtad
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Sin app, sin diseñador. En 3 pasos tu negocio tiene su programa.
          </p>
          <Steps step={step} />
        </header>

        {step === 4 && shareUrl ? (
          <div className="max-w-md mx-auto text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 grid place-items-center mx-auto mb-4">
              <Check size={26} />
            </div>
            <h2 className="text-xl font-semibold">¡Tu programa está listo!</h2>
            <p className="text-gray-500 text-sm mt-1 mb-6">
              Pon este QR en tu mostrador o comparte el enlace. Tus clientes se
              dan de alta en 10 segundos, sin descargar nada.
            </p>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 inline-block mb-4">
              <QrCode value={shareUrl} size={208} />
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <span className="truncate flex-1 text-left text-gray-700">{shareUrl}</span>
              <button
                onClick={() => {
                  const done = () => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  };
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(shareUrl).then(done).catch(done);
                  } else {
                    const ta = document.createElement('textarea');
                    ta.value = shareUrl;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    done();
                  }
                }}
                className="flex items-center gap-1 text-brand-600 font-medium shrink-0"
              >
                <Copy size={14} /> {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <button
              onClick={() => router.push('/dashboard/')}
              className="mt-6 w-full bg-brand-600 text-white rounded-xl px-4 py-3 font-medium hover:bg-brand-700"
            >
              Ir a mi panel
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Preview en vivo — exactamente como se verá en Apple Wallet */}
            <div className="order-1 md:order-2 md:sticky md:top-8">
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-3 text-center md:text-left">
                Así se verá en Apple Wallet
              </p>
              <div className="flex justify-center">
                <ApplePassPreview
                  merchantName={name.trim() || 'Tu Negocio'}
                  bgColor={color}
                  logoUrl={logoUrl}
                  stampStyle={stampStyle}
                  stampsRequired={stamps}
                  rewardDetail={reward}
                  stamps={Math.min(3, stamps)}
                />
              </div>
            </div>

            {/* Editor */}
            <div className="order-2 md:order-1 space-y-6">
              {step === 0 && (
                <Card title="1 · Tu negocio">
                  <Field label="Nombre del negocio">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Marquesitas OMO"
                      className="input"
                    />
                  </Field>
                  <Field label="Giro">
                    <div className="flex flex-wrap gap-2">
                      {INDUSTRIES.map((g) => (
                        <button
                          key={g.v}
                          onClick={() => setIndustry(g.v)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm border',
                            industry === g.v
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-white text-gray-600 border-gray-300'
                          )}
                        >
                          {g.l}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Logo del negocio (opcional)">
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 grid place-items-center">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoUrl}
                            alt="logo"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">Sin logo</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-brand-400">
                          <ImagePlus size={15} />
                          {logoUrl ? 'Cambiar logo' : 'Subir logo'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              try {
                                setPendingLogoSrc(await readFileAsDataUrl(f));
                              } catch {
                                setError('No pudimos leer esa imagen. Usa PNG o JPG.');
                              }
                              // reset para permitir re-elegir el mismo archivo
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl(undefined)}
                            className="w-fit text-xs text-gray-500 hover:text-gray-800"
                          >
                            Quitar
                          </button>
                        )}
                        <span className="text-xs text-gray-400">
                          PNG o JPG. Tú eliges el recorte.
                        </span>
                      </div>
                    </div>
                  </Field>
                  {!logoUrl && (
                    <Field label="O usa iniciales">
                      <input
                        value={logoText}
                        onChange={(e) => setLogoText(e.target.value.slice(0, 3))}
                        placeholder="Auto"
                        className="input w-24"
                      />
                    </Field>
                  )}
                  <Nav
                    onNext={() => setStep(1)}
                    nextDisabled={!canDesign}
                  />
                </Card>
              )}

              {step === 1 && (
                <Card title="2 · Diseño">
                  <Field label="Color del pase (fondo de la tarjeta)">
                    <div
                      className="flex flex-wrap gap-2"
                      onDragOver={(e) => e.preventDefault()}
                    >
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          draggable
                          onDragEnd={() => setColor(c)}
                          onClick={() => setColor(c)}
                          className={cn(
                            'w-9 h-9 rounded-full ring-2 ring-offset-2 cursor-grab active:cursor-grabbing flex items-center justify-center',
                            color === c ? 'ring-gray-900' : 'ring-transparent'
                          )}
                          style={{ background: c }}
                          aria-label={`Color ${c}`}
                        >
                          {color === c && <Check size={14} className="text-white" />}
                        </button>
                      ))}
                      <span className="flex items-center gap-1 text-xs text-gray-400 ml-1">
                        <Palette size={13} /> o tócalo
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Este es el color de fondo del pase en Apple Wallet. El texto
                      se ajusta solo para que se lea bien.
                    </p>
                  </Field>
                  <Field label="Tu sello">
                    <div className="flex flex-wrap gap-2">
                      {STAMP_STYLES.map((s) => {
                        const isLogo = s.v === 'logo';
                        const disabled = isLogo && !logoUrl;
                        const active = stampStyle === s.v;
                        return (
                          <button
                            key={s.v}
                            type="button"
                            disabled={disabled}
                            onClick={() => setStampPick(s.v)}
                            title={
                              disabled ? 'Sube un logo para usar este estilo' : s.l
                            }
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border',
                              disabled && 'opacity-40 cursor-not-allowed',
                              active
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-600 border-gray-300'
                            )}
                          >
                            {isLogo && logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={logoUrl}
                                alt=""
                                className="h-4 w-4 rounded-full object-cover"
                                aria-hidden
                              />
                            ) : (
                              <span aria-hidden>{s.glyph}</span>
                            )}
                            {s.l}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Es el ícono que se llena al sellar. Con &quot;Logo&quot;
                      usamos tu logo recortado en círculo, automático.
                    </p>
                  </Field>
                  <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
                </Card>
              )}

              {step === 2 && (
                <Card title="3 · Premio">
                  <Field label="Elige el premio">
                    <div className="space-y-2">
                      {REWARDS.map((r) => (
                        <button
                          key={r}
                          draggable
                          onDragEnd={() => setReward(r)}
                          onClick={() => setReward(r)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left cursor-grab active:cursor-grabbing',
                            reward === r
                              ? 'border-brand-600 bg-brand-50 text-brand-700'
                              : 'border-gray-200 bg-white text-gray-700'
                          )}
                        >
                          <GripVertical size={15} className="text-gray-400 shrink-0" />
                          <Gift size={15} className="shrink-0" />
                          {r}
                          {reward === r && <Check size={15} className="ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label={`Sellos para el premio: ${stamps}`}>
                    <input
                      type="range"
                      min={4}
                      max={12}
                      value={stamps}
                      onChange={(e) => setStamps(Number(e.target.value))}
                      className="w-full accent-brand-600"
                    />
                  </Field>
                  <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="Crear cuenta" />
                </Card>
              )}

              {step === 3 && (
                <Card title="Casi listo · Tu cuenta">
                  <Field label="Correo">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@negocio.com"
                      className="input"
                    />
                  </Field>
                  <Field label="Contraseña">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="input"
                    />
                  </Field>
                  {error && (
                    <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-3 space-y-2">
                      <p>{error}</p>
                      {emailExists && (
                        <Link
                          href="/login/"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                        >
                          <LogIn size={14} /> Ir a iniciar sesión
                        </Link>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-1 text-sm text-gray-500"
                    >
                      <ArrowLeft size={15} /> Atrás
                    </button>
                    <button
                      onClick={finish}
                      disabled={busy || email.length < 5 || password.length < 8}
                      className="flex items-center gap-2 bg-brand-600 text-white rounded-xl px-5 py-2.5 font-medium disabled:opacity-50 hover:bg-brand-700"
                    >
                      {busy ? 'Creando…' : 'Lanzar mi programa'}
                      {!busy && <ArrowRight size={16} />}
                    </button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.6rem;
          padding: 0.55rem 0.75rem;
          outline: none;
          font-size: 0.95rem;
        }
        .input:focus {
          border-color: #6366f1;
        }
      `}</style>
      {pendingLogoSrc && (
        <LogoCropper
          src={pendingLogoSrc}
          onConfirm={(dataUrl) => {
            setLogoUrl(dataUrl);
            setPendingLogoSrc(null);
          }}
          onCancel={() => setPendingLogoSrc(null)}
        />
      )}
    </main>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ['Negocio', 'Diseño', 'Premio', 'Cuenta', 'Listo'];
  const idx = Math.min(step, 4);
  return (
    <div className="flex items-center justify-center gap-2 mt-5">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full',
              i <= idx ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'
            )}
          >
            {i < idx ? <Check size={12} /> : <span>{i + 1}</span>}
            {l}
          </div>
          {i < labels.length - 1 && (
            <div className={cn('w-5 h-px', i < idx ? 'bg-brand-600' : 'bg-gray-200')} />
          )}
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      {children}
    </div>
  );
}

function Nav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = 'Siguiente',
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500">
          <ArrowLeft size={15} /> Atrás
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex items-center gap-2 bg-brand-600 text-white rounded-xl px-5 py-2.5 font-medium disabled:opacity-50 hover:bg-brand-700"
      >
        {nextLabel} <ArrowRight size={16} />
      </button>
    </div>
  );
}
