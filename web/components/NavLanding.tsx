'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import IntegraLogo from '@/components/IntegraLogo';

/**
 * Navbar de la landing.
 * Transparente mientras el hero es visible en pantalla.
 * Cuando el hero sale del viewport → frosted glass con borde y sombra.
 * Usa IntersectionObserver sobre el primer <section> del DOM.
 */
export default function NavLanding() {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('section');
    if (!hero) return;

    const io = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <nav
      className={cn(
        'fixed inset-x-0 top-0 z-30 border-b transition-[background-color,border-color,box-shadow] duration-300',
        pastHero
          ? 'border-paper-300 bg-white/90 shadow-[0_1px_0_rgba(15,13,10,0.04),0_2px_12px_rgba(15,13,10,0.06)] backdrop-blur-xl'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-ink-900">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-ink-900 text-paper-50">
            <IntegraLogo size={18} />
          </span>
          <span>Integra AI · Loyalty</span>
        </Link>
        <div className="ml-auto hidden items-center gap-1 text-sm md:flex">
          <a href="#problema" className="rounded-full px-3 py-2 text-[#5a5450] transition-colors hover:bg-white/60 hover:text-ink-900">
            Problema
          </a>
          <a href="#como" className="rounded-full px-3 py-2 text-[#5a5450] transition-colors hover:bg-white/60 hover:text-ink-900">
            Proceso
          </a>
          <a href="#precios" className="rounded-full px-3 py-2 text-[#5a5450] transition-colors hover:bg-white/60 hover:text-ink-900">
            Planes
          </a>
        </div>
        <div className="ml-auto flex items-center gap-2 md:ml-2">
          <Link
            href="/login/"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#5a5450] transition-colors hover:bg-white/60 hover:text-ink-900 sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            href="/onboarding/"
            className="inline-flex min-h-11 items-center rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-paper-50 transition-colors hover:bg-ink-800"
          >
            Crear piloto
          </Link>
        </div>
      </div>
    </nav>
  );
}
