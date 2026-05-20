import Link from 'next/link';
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
import IntegraLogo from '@/components/IntegraLogo';
import LoyaltyPass from '@/components/LoyaltyPass';

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

function Nav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-paper-300/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-ink-900">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-ink-900 text-paper-50">
            <IntegraLogo size={18} />
          </span>
          <span>Integra AI · Loyalty</span>
        </Link>
        <div className="ml-auto hidden items-center gap-1 text-sm md:flex">
          <a href="#problema" className="rounded-full px-3 py-2 text-[#5a5450] transition hover:bg-white hover:text-ink-900">
            Problema
          </a>
          <a href="#como" className="rounded-full px-3 py-2 text-[#5a5450] transition hover:bg-white hover:text-ink-900">
            Proceso
          </a>
          <a href="#precios" className="rounded-full px-3 py-2 text-[#5a5450] transition hover:bg-white hover:text-ink-900">
            Planes
          </a>
        </div>
        <div className="ml-auto flex items-center gap-2 md:ml-2">
          <Link href="/login/" className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#5a5450] transition hover:bg-white hover:text-ink-900 sm:inline-flex">
            Entrar
          </Link>
          <Link
            href="/onboarding/"
            className="inline-flex min-h-11 items-center rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-paper-50 transition hover:bg-ink-800"
          >
            Crear piloto
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function Home() {
  return (
    <main className="flex-1">
      <Nav />

      <section className="bg-white">
        <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div>
            <p className="inline-flex rounded-full border border-paper-300 bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8c8780]">
              Producto Integra AI · Wallet loyalty
            </p>
            <h1 className="mt-6 max-w-4xl text-[3.4rem] font-bold leading-[0.95] tracking-[-0.025em] text-ink-900 sm:text-6xl lg:text-[5.5rem]">
              Lealtad sin app, lista para operar.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-[1.7] text-[#5a5450]">
              Integra Loyalty convierte un programa de sellos en una tarjeta viva de Apple Wallet y Google Wallet, con alta por QR, actualizaciones nativas y métricas desde el primer piloto.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
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
            <div className="mt-12 grid max-w-2xl grid-cols-3 gap-4 border-t border-paper-300 pt-6">
              <Metric value='<5 min' label='alta del comercio' />
              <Metric value='0' label='apps a instalar' />
              <Metric value='2' label='wallets nativos' />
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="mx-auto max-w-[30rem] rounded-[2rem] border border-paper-300 bg-white p-4 shadow-[0_18px_60px_rgba(15,13,10,0.08)] sm:p-6">
              <div className="rounded-[1.5rem] border border-paper-300 bg-white p-4">
                <LoyaltyPass
                  merchantName="Café Mérida"
                  brandColor="#5B3A1F"
                  tagline="Tostado de altura"
                  programName="Tarjeta Café Mérida"
                  stampsRequired={7}
                  rewardDetail="Café gratis"
                  stamps={5}
                  variant="preview"
                />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <TechPill icon={ShieldCheck} label="PassKit" />
                <TechPill icon={Smartphone} label="Google Wallet" />
                <TechPill icon={ScanLine} label="QR por comercio" />
                <TechPill icon={Radio} label="Push / geofence" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="problema" className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.55fr_1fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-500">Problema operativo</p>
              <h2 className="mt-5 text-4xl font-bold leading-[0.98] tracking-[-0.02em] text-ink-900 md:text-5xl">
                La lealtad falla cuando depende de fricción.
              </h2>
            </div>
            <div className="divide-y divide-paper-300 border-y border-paper-300">
              {CHALLENGES.map((item, index) => (
                <EditorialRow key={item.title} index={index + 1} title={item.title} body={item.body} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="como" className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.55fr_1fr] lg:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-500">Cómo funciona</p>
              <h2 className="mt-5 text-4xl font-bold leading-[0.98] tracking-[-0.02em] text-ink-900 md:text-5xl">
                Del QR al canje, sin inventar otra app.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-[1.75] text-[#5a5450] lg:justify-self-end">
              El flujo está diseñado para validar operación real: configuración, alta de cliente, tarjeta activa, sellos, notificaciones y métricas.
            </p>
          </div>
          <div className="mt-14 divide-y divide-paper-300 border-y border-paper-300 bg-white">
            {PROCESS.map((step, index) => (
              <ProcessRow key={step.title} index={index + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.58fr_1fr] lg:items-start">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-500">Capacidades</p>
              <h2 className="mt-5 text-4xl font-bold leading-[0.98] tracking-[-0.02em] text-ink-900 md:text-5xl">
                Tecnología de producto, presentada con calma.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-[1.75] text-[#5a5450]">
                La landing no necesita prometer magia. Tiene que dejar claro que el sistema puede operar en campo y escalar desde un piloto medible.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-paper-300 bg-paper-300 sm:grid-cols-2">
              {CAPABILITIES.map((capability) => (
                <Capability key={capability.label} {...capability} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.52fr_1fr] lg:items-start">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-500">Planes</p>
              <h2 className="mt-5 text-4xl font-bold leading-[0.98] tracking-[-0.02em] text-ink-900 md:text-5xl">
                Precio simple para validar rápido.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-[1.75] text-[#5a5450]">
                14 días gratis. Sin tarjeta de crédito. Los planes quedan como soporte comercial, no como el centro del mensaje.
              </p>
            </div>
            <div className="divide-y divide-paper-300 border-y border-paper-300">
              {PLANS.map((plan) => (
                <PlanRow key={plan.name} {...plan} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink-900 py-24 text-[#f5f0e8] lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.65fr_0.35fr] lg:items-end lg:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#9e9890]">Producto Integra AI</p>
            <h2 className="mt-5 max-w-4xl text-4xl font-bold leading-[0.98] tracking-[-0.02em] md:text-5xl">
              Construido para probar una operación, no para quedarse en demo.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-[1.75] text-[#c8c3bc]">
              Loyalty conserva el mismo criterio de Integra: claridad técnica, evidencia operativa y una experiencia que puede pasar de piloto a producción.
            </p>
          </div>
          <Link
            href="/onboarding/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f5f0e8] px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-white"
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

function EditorialRow({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <div className="grid gap-4 py-7 sm:grid-cols-[5rem_0.8fr_1fr] sm:items-start">
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
}: {
  index: number;
  icon: LucideIcon;
  title: string;
  body: string;
  meta: string;
}) {
  return (
    <div className="grid gap-5 px-4 py-7 sm:grid-cols-[5rem_3rem_1fr_7rem] sm:items-center sm:px-6">
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

function Capability({ icon: Icon, label, detail }: { icon: LucideIcon; label: string; detail: string }) {
  return (
    <div className="bg-white p-6">
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
}: {
  name: string;
  price: string;
  detail: string;
  features: string[];
}) {
  return (
    <div className="grid gap-5 py-7 lg:grid-cols-[0.35fr_0.25fr_1fr_auto] lg:items-start">
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
