import Link from 'next/link';
import { ArrowRight, Smartphone, Zap, MapPin } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex-1">
      <section className="px-4 pt-20 pb-16 text-center max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-brand-600 mb-4">
          Integra Loyalty
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-5">
          La tarjeta de lealtad de tu negocio,
          <br className="hidden md:block" /> sin app y sin imprimir nada.
        </h1>
        <p className="text-lg text-gray-600 mb-9 max-w-xl mx-auto">
          Tus clientes guardan la tarjeta en Apple Wallet o Google Wallet con un
          tap. Tú la creas en 3 pasos. Listo para vender hoy.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/onboarding/"
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-7 py-3.5 text-sm font-medium"
          >
            Crear mi tarjeta gratis <ArrowRight size={16} />
          </Link>
          <Link
            href="/login/"
            className="inline-flex items-center justify-center border border-gray-300 hover:border-gray-500 rounded-xl px-7 py-3.5 text-sm font-medium"
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Sin contrato · Prueba sin tarjeta de crédito · Soporte por WhatsApp
        </p>
      </section>

      <section className="px-4 pb-24 max-w-4xl mx-auto grid sm:grid-cols-3 gap-5">
        {[
          {
            icon: Smartphone,
            t: 'Sin app',
            d: 'El cliente escanea un QR y su tarjeta queda en el celular. Nada que descargar.',
          },
          {
            icon: Zap,
            t: 'Plug & play',
            d: 'Eliges color, premio y listo. Te lo configuramos por WhatsApp si lo necesitas.',
          },
          {
            icon: MapPin,
            t: 'Vuelve más seguido',
            d: 'Avisos push y recordatorio al pasar cerca de tu negocio. Sin costo por mensaje.',
          },
        ].map(({ icon: Icon, t, d }) => (
          <div
            key={t}
            className="bg-white border border-gray-200 rounded-2xl p-6 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center mb-3">
              <Icon size={18} />
            </div>
            <h3 className="font-semibold mb-1">{t}</h3>
            <p className="text-sm text-gray-600">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
