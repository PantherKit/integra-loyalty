'use client';

import { useEffect } from 'react';

/**
 * Inicializa el sistema de scroll-reveal para elementos below-fold.
 *
 * El hero usa @keyframes directos (hero-1…hero-card) — sin IO — para
 * evitar el race condition de CSS batching: cuando el IO dispara en el
 * mismo frame en que se añade `js-motion-ready`, el navegador colapsa
 * opacity:0 → opacity:1 en un solo paint y la transición nunca se ve.
 *
 * Fix: doble requestAnimationFrame garantiza que el browser ya pintó el
 * estado opacity:0 antes de que el IO empiece a observar.
 */
export default function ScrollRevealInit() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Activa las reglas CSS de motion (.reveal, .reveal-x)
    document.documentElement.classList.add('js-motion-ready');

    const items = document.querySelectorAll<Element>('.reveal, .reveal-x');
    if (!items.length) return;

    if (prefersReduced) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Doble rAF: el primer frame aplica opacity:0 vía js-motion-ready,
    // el segundo garantiza que ese frame ya fue pintado antes de que el
    // IO empiece a disparar para elementos en viewport.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
        );

        items.forEach((el) => io.observe(el));
      });
    });
  }, []);

  return null;
}
