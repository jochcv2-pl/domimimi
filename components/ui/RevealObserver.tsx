'use client';

import { useEffect } from 'react';

/**
 * RevealObserver · observer global scroll-reveal.
 *
 * Reproduit fidèlement le script du HTML de référence :
 *   const io = new IntersectionObserver(...);
 *   document.querySelectorAll('.reveal').forEach(el => io.observe(el));
 *
 * Pourquoi un observer global plutôt qu'un wrapper par composant ?
 * Le HTML de référence pose la classe `.reveal` directement sur des éléments
 * (cards, steps, quotes, details FAQ). Un observer global capte TOUS les
 * `.reveal`, y compris ceux posés en classe nue sans wrapper <Reveal>.
 * L'ajout de `.in` est idempotente (classList.add), donc compatible avec le
 * wrapper <Reveal> qui existe déjà.
 */
export default function RevealObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    const els = document.querySelectorAll('.reveal');
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
