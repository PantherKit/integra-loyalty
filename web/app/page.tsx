import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BellRing,
  Check,
  Cloud,
  CreditCard,
  Database,
  MapPin,
  QrCode,
  Radio,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import IntegraLogo from '@/components/IntegraLogo';
import NavLanding from '@/components/NavLanding';
import ScrollRevealInit from '@/components/ScrollRevealInit';
import LenisInit from '@/components/LenisInit';
import Aurora from '@/components/Aurora';

export const metadata = {
  title: 'Integra Loyalty — Lealtad sin app, lista para operar',
  description:
    'Producto de Integra AI para lanzar programas de lealtad en Apple Wallet y Google Wallet, sin app propia y con operación medible.',
};

const CHALLENGES = [
  {
    title: 'Apps que nadie descarga',
    body: 'El cliente ya tiene Wallet en el teléfono. La tarjeta debe vivir ahí, no en otra app que compite por instalación y atención.',
  },
  {
    title: 'Tarjetas físicas sin datos',
    body: 'Sellar cartón no te dice quién volvió, cuántos canjes hubo ni qué programa está funcionando.',
  },
  {
    title: 'Promociones sin canal propio',
    body: 'Sin push nativo o geofence, cada recordatorio depende de SMS, redes sociales o memoria del cliente.',
  },
  {
    title: 'Pilotos que no prueban operación',
    body: 'Un programa de lealtad necesita QR, alta, sellos, canje y métricas desde el primer recorrido.',
  },
];

const PROCESS = [
  {
    icon: Store,
    title: 'Configura el programa',
    body: 'Nombre, premio, sellos requeridos, colores del comercio y reglas base para operar sin fricción.',
    meta: '~3 min',
  },
  {
    icon: QrCode,
    title: 'Comparte un QR por comercio',
    body: 'El cliente escanea desde cámara, llega a una landing mínima y agrega la tarjeta a Wallet.',
    meta: '1 link',
  },
  {
    icon: CreditCard,
    title: 'La tarjeta vive en Wallet',
    body: 'Apple Wallet y Google Wallet mantienen el pase visible, actualizable y listo para canje.',
    meta: 'sin app',
  },
  {
    icon: BellRing,
    title: 'Mide sellos, canjes y retorno',
    body: 'El dashboard permite operar clientes, actividad, adopción Wallet y campañas futuras.',
    meta: 'KPIs',
  },
];

const CAPABILITIES = [
  { icon: ShieldCheck, label: 'Apple PassKit', detail: 'Pases firmados y actualizables.' },
  { icon: Smartphone, label: 'Google Wallet', detail: 'Loyalty class para Android.' },
  { icon: BellRing, label: 'Push nativo', detail: 'Actualizaciones y recordatorios.' },
  { icon: MapPin, label: 'Geofence', detail: 'Señales cerca del comercio.' },
  { icon: Database, label: 'Multi-tenant', detail: 'Comercios aislados por cuenta.' },
  { icon: Cloud, label: 'Serverless', detail: 'Base para pilotos de bajo costo.' },
];

const PLANS = [
  {
    name: 'Piloto',
    price: '$349',
    detail: '1 sucursal',
    features: ['1 tarjeta de lealtad', 'Apple + Google Wallet', 'QR de alta', 'Panel básico'],
  },
  {
    name: 'Operación',
    price: '$649',
    detail: 'programa activo',
    features: ['Clientes ilimitados', 'Campañas y cumpleaños', 'Geo-notificaciones', 'Onboarding asistido'],
  },
  {
    name: 'Multi-sucursal',
    price: '$1,190',
    detail: 'cadenas y franquicias',
    features: ['3 sucursales incluidas', 'Clientes unificados', 'Reportes por sucursal', 'Roles y permisos'],
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <ScrollRevealInit />
      <LenisInit />
      <NavLanding />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative bg-white">
        {/* Aurora: -top-16 extiende el canvas detrás del nav transparente (h-16).
            overflow-visible en el section para que no se corte. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[65vh] min-h-[400px] max-h-[600px]"
          style={{
            opacity: 0.65,
            maskImage:
              'linear-gradient(to bottom, black 0%, black 15%, transparent 75%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 0%, black 15%, transparent 75%)',
          }}
        >
          <Aurora
            colorStops={['#6366f1', '#a855f7', '#ddd6fe']}
            amplitude={1.1}
            blend={1.2}
            speed={0.12}
          />
        </div>
        <div className="relative mx-auto grid min-h-dvh max-w-7xl items-start gap-16 px-4 pb-20 pt-32 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-32 lg:px-8 lg:pb-28 lg:pt-40">
          <div className="lg:pt-32">
            <h1 className="hero-1 max-w-4xl text-[3.4rem] font-bold leading-[0.95] tracking-[-0.025em] text-ink-900 sm:text-6xl lg:text-[5.5rem]">
              <span className="relative inline-block mb-[0.25em]">
                Lealtad
                {/* Wrapper que ejecuta el clip-path reveal — el SVG queda libre para sangrar */}
                <div
                  className="animate-draw-line pointer-events-none absolute -bottom-[0.68em] left-0 -z-10 h-[1.1em] w-full overflow-hidden"
                >
                  <svg
                    className="absolute left-0 top-[0.34em] h-[0.48em] w-full text-accent-500"
                    viewBox="0 0 200 56"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    style={{ overflow: 'visible' }}
                  >
                    <defs>
                      <filter id="marker-noise" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
                      </filter>
                    </defs>
                    <path
                      d="M 2 38 Q 100 10 198 38"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      filter="url(#marker-noise)"
                    />
                  </svg>
                </div>
              </span>{' '}
              sin app, lista para operar.
            </h1>
            <p className="hero-2 mt-7 max-w-xl text-lg leading-[1.7] text-[#5a5450]">
              Integra Loyalty convierte un programa de sellos en una tarjeta viva de Apple Wallet y Google Wallet, con alta por QR, actualizaciones nativas y métricas desde el primer piloto.
            </p>
            <div className="hero-3 mt-9 flex flex-wrap gap-3">
              <Link
                href="/onboarding/"
                className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-paper-50 transition hover:bg-ink-800"
              >
                Crear tarjeta piloto
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#como"
                className="inline-flex min-h-12 items-center rounded-full border border-paper-300 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition hover:border-[#cdc6b9]"
              >
                Ver proceso
              </a>
            </div>
            <div className="hero-4 mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t border-paper-300 pt-6">
              <Metric value='<5 min' label='alta del comercio' />
              <Metric value='0' label='apps a instalar' />
              <Metric value='2' label='wallets nativos' />
            </div>
          </div>

          <div className="hero-card relative min-w-0 flex items-start justify-end">
            {/* Contenedor del Ramo */}
            <div className="relative w-full max-w-[26rem] aspect-[4/5] mr-4 lg:mr-12">
              
              {/* Mockup 2: Izquierda (Detrás) */}
              {/* Añadimos z-10 y hover:z-30 para que al pasar el mouse salte al frente. Usamos group-hover o hover normal */}
              <div className="absolute left-[-22%] top-20 w-[75%] -rotate-[16deg] transition-all duration-700 ease-out hover:-rotate-6 hover:scale-105 hover:z-30 z-10">
                <div className="animate-float-slow">
                  <Image 
                    src="/MockUp02.png" 
                    alt="Google Wallet" 
                    width={500} 
                    height={1000} 
                    priority 
                    className="h-auto w-full drop-shadow-[0_20px_40px_rgba(15,13,10,0.15)]" 
                  />
                </div>
              </div>

              {/* Mockup 3: Derecha (Detrás) */}
              <div className="absolute right-[-22%] top-24 w-[75%] rotate-[16deg] transition-all duration-700 ease-out hover:rotate-6 hover:scale-105 hover:z-30 z-10">
                <div className="animate-float-slower">
                  <Image 
                    src="/MockUp03.png" 
                    alt="Notificación Geofence" 
                    width={500} 
                    height={1000} 
                    priority 
                    className="h-auto w-full drop-shadow-[0_20px_40px_rgba(15,13,10,0.15)]" 
                  />
                </div>
              </div>

              {/* Mockup 1: Centro (Frente) */}
              <div className="absolute inset-x-[5%] top-0 transition-all duration-700 ease-out hover:scale-105 z-20">
                <div className="animate-float-slowest">
                  <Image 
                    src="/MockUp01.png" 
                    alt="Apple Wallet Pass" 
                    width={500} 
                    height={1000} 
                    priority 
                    className="h-auto w-full drop-shadow-[0_30px_60px_rgba(15,13,10,0.25)]" 
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── Problema ───────────────────────────────────────── */}
      <section id="problema" className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.55fr_1fr]">
            <div>
              <p className="reveal font-mono text-[11px] uppercase tracking-[0.18em] text-accent-500">Problema operativo</p>
              <h2 className="reveal stagger-1 mt-5 text-4xl font-bold leading-[0.98] tracking-[-0.02em] text-ink-900 md:text-5xl">
                La lealtad falla cuando depende de fricción.
              </h2>
            </div>
            <div className="divide-y divide-paper-300 border-y border-paper-300">
              {CHALLENGES.map((item, index) => (
                <EditorialRow
                  key={item.title}
                  index={index + 1}
                  title={item.title}
                  body={item.body}
                  className={`reveal stagger-${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ──────────────────────────────────── */}
      <section id="como" className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.55fr_1fr] lg:items-end">
            <div>
              <p className="reveal font-mono text-[11px] uppercase tracking-[0.18em] text-accent-500">Cómo funciona</p>
              <h2 className="reveal stagger-1 mt-5 text-4xl font-bold leading-[0.98] tracking-[-0.02em] text-ink-900 md:text-5xl">
                Del QR al canje, sin inventar otra app.
              </h2>
            </div>
            <p className="reveal stagger-2 max-w-2xl text-base leading-[1.75] text-[#5a5450] lg:justify-self-end">
              El flujo está diseñado para validar operación real: configuración, alta de cliente, tarjeta activa, sellos, notificaciones y métricas.
            </p>
          </div>
          <div className="mt-14 divide-y divide-paper-300 border-y border-paper-300 bg-white">
            {PROCESS.map((step, index) => (
              <ProcessRow
                key={step.title}
                index={index + 1}
                {...step}
                className={`reveal stagger-${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Capacidades ────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.58fr_1fr] lg:items-start">
            <div>
              <p className="reveal font-mono text-[11px] uppercase tracking-[0.18em] text-accent-500">Capacidades</p>
              <h2 className="reveal stagger-1 mt-5 text-4xl font-bold leading-[0.98] tracking-[-0.02em] text-ink-900 md:text-5xl">
                Tecnología de producto, presentada con calma.
              </h2>
              <p className="reveal stagger-2 mt-6 max-w-xl text-base leading-[1.75] text-[#5a5450]">
                La landing no necesita prometer magia. Tiene que dejar claro que el sistema puede operar en campo y escalar desde un piloto medible.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-paper-300 bg-paper-300 sm:grid-cols-2">
              {CAPABILITIES.map((capability, index) => (
                <Capability
                  key={capability.label}
                  {...capability}
                  className={`reveal stagger-${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Precios ────────────────────────────────────────── */}
      <section id="precios" className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.52fr_1fr] lg:items-start">
            <div>
              <p className="reveal font-mono text-[11px] uppercase tracking-[0.18em] text-accent-500">Planes</p>
              <h2 className="reveal stagger-1 mt-5 text-4xl font-bold leading-[0.98] tracking-[-0.02em] text-ink-900 md:text-5xl">
                Precio simple para validar rápido.
              </h2>
              <p className="reveal stagger-2 mt-6 max-w-xl text-base leading-[1.75] text-[#5a5450]">
                14 días gratis. Sin tarjeta de crédito. Los planes quedan como soporte comercial, no como el centro del mensaje.
              </p>
            </div>
            <div className="divide-y divide-paper-300 border-y border-paper-300">
              {PLANS.map((plan, index) => (
                <PlanRow
                  key={plan.name}
                  {...plan}
                  className={`reveal stagger-${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ──────────────────────────────────────── */}
      <section className="bg-ink-900 py-24 text-[#f5f0e8] lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.65fr_0.35fr] lg:items-end lg:px-8">
          <div>
            <p className="reveal font-mono text-[11px] uppercase tracking-[0.18em] text-[#9e9890]">Producto Integra AI</p>
            <h2 className="reveal stagger-1 mt-5 max-w-4xl text-4xl font-bold leading-[0.98] tracking-[-0.02em] md:text-5xl">
              Construido para probar una operación, no para quedarse en demo.
            </h2>
            <p className="reveal stagger-2 mt-6 max-w-2xl text-base leading-[1.75] text-[#c8c3bc]">
              Loyalty conserva el mismo criterio de Integra: claridad técnica, evidencia operativa y una experiencia que puede pasar de piloto a producción.
            </p>
          </div>
          <Link
            href="/onboarding/"
            className="reveal stagger-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f5f0e8] px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-white"
          >
            Crear tarjeta piloto <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#252220] bg-ink-900 text-[#9e9890]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md border border-[#252220] bg-[#f5f0e8] text-ink-900">
              <IntegraLogo size={17} />
            </span>
            <span className="text-[#f5f0e8]">Integra AI · Loyalty</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/login/" className="hover:text-[#f5f0e8]">Entrar</Link>
            <Link href="/onboarding/" className="hover:text-[#f5f0e8]">Crear piloto</Link>
            <a href="#precios" className="hover:text-[#f5f0e8]">Planes</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold tracking-[-0.03em] text-ink-900">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c8780]">{label}</div>
    </div>
  );
}

function TechPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-paper-300 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5450]">
      <Icon size={13} className="text-accent-500" />
      {label}
    </div>
  );
}

function EditorialRow({
  index,
  title,
  body,
  className,
}: {
  index: number;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 py-7 sm:grid-cols-[5rem_0.8fr_1fr] sm:items-start', className)}>
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8c8780]">
        {String(index).padStart(2, '0')}
      </span>
      <h3 className="text-xl font-semibold leading-tight tracking-[-0.018em] text-ink-900">{title}</h3>
      <p className="text-sm leading-[1.75] text-[#5a5450]">{body}</p>
    </div>
  );
}

function ProcessRow({
  index,
  icon: Icon,
  title,
  body,
  meta,
  className,
}: {
  index: number;
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-5 px-4 py-7 sm:grid-cols-[5rem_3rem_1fr_7rem] sm:items-center sm:px-6', className)}>
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8c8780]">
        {String(index).padStart(2, '0')}
      </span>
      <span className="grid h-11 w-11 place-items-center rounded-full border border-paper-300 bg-white text-ink-900">
        <Icon size={19} />
      </span>
      <span>
        <strong className="block text-xl font-semibold tracking-[-0.018em] text-ink-900">{title}</strong>
        <span className="mt-1 block max-w-2xl text-sm leading-[1.7] text-[#5a5450]">{body}</span>
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-500 sm:text-right">{meta}</span>
    </div>
  );
}

function Capability({
  icon: Icon,
  label,
  detail,
  className,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className={cn('bg-white p-6', className)}>
      <div className="mb-5 grid h-10 w-10 place-items-center rounded-full border border-paper-300 bg-white text-accent-500">
        <Icon size={18} />
      </div>
      <h3 className="text-base font-semibold text-ink-900">{label}</h3>
      <p className="mt-2 text-sm leading-[1.65] text-[#5a5450]">{detail}</p>
    </div>
  );
}

function PlanRow({
  name,
  price,
  detail,
  features,
  className,
}: {
  name: string;
  price: string;
  detail: string;
  features: string[];
  className?: string;
}) {
  return (
    <div className={cn('grid gap-5 py-7 lg:grid-cols-[0.35fr_0.25fr_1fr_auto] lg:items-start', className)}>
      <div>
        <h3 className="text-xl font-semibold tracking-[-0.018em] text-ink-900">{name}</h3>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8c8780]">{detail}</p>
      </div>
      <div>
        <span className="text-3xl font-semibold tracking-[-0.03em] text-ink-900">{price}</span>
        <span className="block text-xs text-[#8c8780]">MXN/mes</span>
      </div>
      <ul className="grid gap-2 text-sm text-[#5a5450] sm:grid-cols-2">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-accent-500" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/onboarding/"
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-paper-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-[#cdc6b9]"
      >
        Empezar
      </Link>
    </div>
  );
}
