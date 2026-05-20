'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Smooth scroll inercial portado de integra-landing.
 * Solo activo en desktop con puntero fino (no touch) y sin prefers-reduced-motion.
 * Mismos parámetros que Core: lerp 0.085, wheelMultiplier 0.9.
 */
export default function LenisInit() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    if (prefersReduced || isTouch) return;

    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      autoRaf: true,
    });

    return () => lenis.destroy();
  }, []);

  return null;
}
