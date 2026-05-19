import Link from 'next/link';
import {
  ArrowRight,
  Smartphone,
  Zap,
  MapPin,
  BellRing,
  QrCode,
  Check,
  Store,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import IntegraLogo from '@/components/IntegraLogo';
import LoyaltyPass from '@/components/LoyaltyPass';

export const metadata = {
  title: 'Integra Lealtad — Tarjetas de lealtad en Apple y Google Wallet, sin app',
  description:
    'El programa de lealtad de tu negocio en el celular del cliente. Sin app, sin imprimir, sin contrato. Prueba 14 días gratis.',
};

function Nav() {
  return (
    <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <span className="w-8 h-8 rounded-lg bg-[#191919] text-white grid place-items-center">
            <IntegraLogo size={18} />
          </span>
          Integra <span className="text-brand-600">Lealtad</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-sm">
          <a href="#precios" className="hidden sm:block text-gray-600 hover:text-gray-900">
            Precios
          </a>
          <a href="#como" className="hidden sm:block text-gray-600 hover:text-gray-900">
            Cómo funciona
          </a>
          <Link href="/login/" className="text-gray-700 hover:text-gray-900">
            Entrar
          </Link>
          <Link
            href="/onboarding/"
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 font-medium"
          >
            Crear cuenta
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

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#191919] text-white">
        <div
          aria-hidden
          className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-brand-600/30 blur-3xl"
        />
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-brand-200 bg-white/10 rounded-full px-3 py-1 mb-6">
              <Sparkles size={13} /> Sin app · Sin contrato · 14 días gratis
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
              El programa de lealtad de tu negocio,
              <span className="text-brand-300"> en el celular del cliente.</span>
            </h1>
            <p className="text-lg text-gray-300 mt-6 max-w-lg">
              Tarjeta de sellos digital en Apple Wallet y Google Wallet. El
              cliente la guarda con un tap, tú la creas en 3 minutos. Adiós a las
              tarjetas de cartón que se pierden.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                href="/onboarding/"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl px-7 py-3.5 font-medium"
              >
                Crear mi tarjeta gratis <ArrowRight size={16} />
              </Link>
              <a
                href="#como"
                className="inline-flex items-center justify-center border border-white/25 hover:border-white/50 rounded-xl px-7 py-3.5 font-medium"
              >
                Ver cómo funciona
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              No pedimos tarjeta de crédito para empezar. Soporte por WhatsApp.
            </p>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="rotate-3 hover:rotate-0 transition-transform duration-500">
              <LoyaltyPass
                merchantName="Marquesitas OMO"
                brandColor="#d97706"
                tagline="Cafetería"
                programName="Tarjeta Marquesitas OMO"
                stampsRequired={8}
                rewardDetail="Una marquesita gratis"
                stamps={5}
                variant="preview"
              />
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="relative border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-3 gap-4 text-center">
            {[
              ['3 min', 'para lanzar tu programa'],
              ['0', 'apps que descargar'],
              ['$0', 'por mensaje de aviso'],
            ].map(([n, l]) => (
              <div key={l}>
                <p className="text-2xl md:text-3xl font-semibold text-brand-300">{n}</p>
                <p className="text-xs md:text-sm text-gray-400 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEMA → SOLUCIÓN */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-gray-200 p-7 bg-gray-50">
            <p className="text-sm font-semibold text-gray-500 mb-3">Hoy</p>
            <ul className="space-y-3 text-gray-700">
              {[
                'Tarjetas de cartón que se mojan, se pierden y se olvidan.',
                'Reimprimir y sellar a mano cada mes cuesta tiempo y dinero.',
                'No sabes quién vuelve ni cuánto gasta.',
                'No puedes avisar de una promoción sin pagar SMS.',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-gray-400">✕</span> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-brand-200 p-7 bg-brand-50/40">
            <p className="text-sm font-semibold text-brand-600 mb-3">Con Integra Lealtad</p>
            <ul className="space-y-3 text-gray-800">
              {[
                'La tarjeta vive en el celular que el cliente siempre trae.',
                'Das el sello desde tu panel; nunca se acaba ni se reimprime.',
                'Ves clientes, sellos y canjes en tiempo real.',
                'Avisos push ilimitados, sin costo por mensaje.',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check size={18} className="text-brand-600 flex-shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Cómo funciona
          </h2>
          <p className="text-gray-600 text-center mt-2 mb-12">
            De cero a tu primer cliente con tarjeta en menos de 5 minutos.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Store, t: '1 · Crea tu tarjeta', d: 'Eliges color y premio. Sin diseñador, sin app.' },
              { icon: QrCode, t: '2 · Comparte tu QR', d: 'Ponlo en el mostrador. El cliente lo escanea.' },
              { icon: Smartphone, t: '3 · Cliente la guarda', d: 'Pone su teléfono y la tarjeta queda en su Wallet.' },
              { icon: BellRing, t: '4 · Das sellos', d: 'Cada compra suma un sello; su tarjeta se actualiza sola.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold mb-1">{t}</h3>
                <p className="text-sm text-gray-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUÉ WALLET */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-12">
          Por qué en Apple/Google Wallet
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Smartphone, t: 'Cero fricción', d: 'Nada que descargar ni instalar. La tarjeta entra a Wallet con un tap, donde el cliente ya tiene sus tarjetas.' },
            { icon: BellRing, t: 'Push nativo gratis', d: 'Avisas de promociones y de "te falta 1 sello" sin pagar por mensaje, como notificación del sistema.' },
            { icon: MapPin, t: 'Recordatorio por ubicación', d: 'El pase puede recordarle al cliente cuando pasa cerca de tu negocio. Vuelve más seguido.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-gray-200 p-7">
              <div className="w-11 h-11 rounded-xl bg-[#191919] text-white grid place-items-center mb-4">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t}</h3>
              <p className="text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANTILLAS / PARA QUIÉN */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Hecho para tu negocio
          </h2>
          <p className="text-gray-600 text-center mt-2 mb-12">
            Cafeterías, estéticas, lavanderías, loncherías… pymes que quieren que
            el cliente vuelva.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {[
              { n: 'Café Origen', c: '#7c3aed', g: 'Cafetería', r: 'Un café gratis' },
              { n: 'Studio Bella', c: '#db2777', g: 'Estética', r: '20% en tu corte' },
              { n: 'Tacos El Güero', c: '#dc2626', g: 'Restaurante', r: 'Orden gratis' },
            ].map((m) => (
              <LoyaltyPass
                key={m.n}
                merchantName={m.n}
                brandColor={m.c}
                tagline={m.g}
                programName={`Tarjeta ${m.n}`}
                stampsRequired={8}
                rewardDetail={m.r}
                stamps={4}
                variant="preview"
                className="max-w-[20rem]"
              />
            ))}
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-center">
          Precios claros, sin sorpresas
        </h2>
        <p className="text-gray-600 text-center mt-2 mb-3">
          14 días gratis. Sin contrato, cancela cuando quieras. Plan anual = 2
          meses gratis.
        </p>
        <p className="text-xs text-gray-400 text-center mb-12">
          Precios en pesos mexicanos (MXN), por mes.
        </p>
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {[
            {
              name: 'Básico',
              price: '$349',
              tagline: '1 sucursal',
              feats: ['1 tarjeta de lealtad', 'Apple + Google Wallet', '~1,000 clientes', 'Push ilimitado', 'QR de alta', 'Panel básico'],
              hot: false,
            },
            {
              name: 'Pro',
              price: '$649',
              tagline: 'El más elegido',
              feats: ['Todo lo de Básico', 'Clientes ilimitados', 'Campañas y cumpleaños', 'Onboarding por WhatsApp', 'Geo-notificaciones', 'Hasta 3 usuarios'],
              hot: true,
            },
            {
              name: 'Multi-sucursal',
              price: '$1,190',
              tagline: 'Cadenas y franquicias',
              feats: ['Todo lo de Pro', '3 sucursales incluidas', 'Base de clientes unificada', 'Reportes por sucursal', 'Roles y permisos', 'Soporte prioritario'],
              hot: false,
            },
          ].map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-7 border ${
                p.hot
                  ? 'border-brand-600 shadow-xl shadow-brand-600/10 relative bg-white'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {p.hot && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Más elegido
                </span>
              )}
              <p className="text-sm font-semibold text-gray-500">{p.name}</p>
              <p className="text-xs text-gray-400 mb-4">{p.tagline}</p>
              <p className="text-4xl font-semibold">
                {p.price}
                <span className="text-base text-gray-400 font-normal"> MXN/mes</span>
              </p>
              <Link
                href="/onboarding/"
                className={`mt-6 block text-center rounded-xl px-4 py-3 font-medium ${
                  p.hot
                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                    : 'border border-gray-300 hover:border-gray-500'
                }`}
              >
                Empezar gratis
              </Link>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.feats.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check size={17} className="text-brand-600 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-8">
          ¿Quieres que te lo configuremos? Onboarding asistido por WhatsApp
          incluido en Pro y Multi-sucursal.
        </p>
      </section>

      {/* ANCLA DE VALOR */}
      <section className="bg-[#191919] text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <ShieldCheck size={28} className="mx-auto text-brand-300 mb-5" />
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            “Lo que gastas en reimprimir tarjetas y sellos al año, te alcanza
            para todo un año de Integra — y nunca se te acaban.”
          </h2>
          <p className="text-gray-400 mt-5">
            No pagas software: pagas que el cliente que ya te conoce vuelva. Si
            traes de regreso a 10 clientes una vez más al mes, ya se pagó solo.
          </p>
        </div>
      </section>

      {/* FAQ corto */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-center mb-10">
          Preguntas frecuentes
        </h2>
        <div className="space-y-5">
          {[
            ['¿El cliente necesita descargar una app?', 'No. La tarjeta entra directo a Apple Wallet o Google Wallet. Si no quiere, igual funciona desde una página web.'],
            ['¿Necesito hardware o cambiar mi caja?', 'No. Tú das el sello desde tu celular o computadora, en tu panel.'],
            ['¿Hay contrato forzoso?', 'No. Cancelas cuando quieras y los primeros 14 días son gratis.'],
            ['¿Y si no sé de tecnología?', 'Te armamos tu tarjeta por WhatsApp. Tú solo mandas tu logo y colores.'],
          ].map(([q, a]) => (
            <div key={q} className="rounded-xl border border-gray-200 p-5">
              <p className="font-medium">{q}</p>
              <p className="text-gray-600 text-sm mt-1">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="rounded-3xl bg-brand-600 text-white px-6 py-14 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Lanza tu programa de lealtad hoy
          </h2>
          <p className="text-brand-100 mt-3 max-w-lg mx-auto">
            14 días gratis. Sin tarjeta de crédito. Tu primer cliente con tarjeta
            en minutos.
          </p>
          <Link
            href="/onboarding/"
            className="inline-flex items-center gap-2 bg-white text-brand-700 rounded-xl px-8 py-4 font-semibold mt-8 hover:bg-brand-50"
          >
            Crear mi tarjeta gratis <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-[#191919] text-white grid place-items-center">
              <IntegraLogo size={13} />
            </span>
            Integra Lealtad · por Integra Group AI
          </div>
          <div className="flex gap-5">
            <Link href="/login/" className="hover:text-gray-900">Entrar</Link>
            <Link href="/onboarding/" className="hover:text-gray-900">Crear cuenta</Link>
            <a href="#precios" className="hover:text-gray-900">Precios</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
