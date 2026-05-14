import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex-1 grid place-items-center px-4">
      <div className="max-w-2xl text-center py-20">
        <p className="text-xs uppercase tracking-widest text-brand-600 mb-4">Integra Loyalty · dev</p>
        <h1 className="text-5xl font-semibold tracking-tight mb-6">
          Tarjetas de lealtad digital sin app.
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Plataforma SaaS multi-tenant para comercios. Tus clientes agregan la tarjeta a Apple Wallet o Google Wallet con un tap.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/signup/" className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-6 py-3 text-sm font-medium">
            Crear cuenta
          </Link>
          <Link href="/login/" className="border border-gray-300 hover:border-gray-500 rounded-lg px-6 py-3 text-sm font-medium">
            Entrar
          </Link>
        </div>
      </div>
    </main>
  );
}
