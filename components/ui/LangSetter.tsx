"use client";

import { useEffect } from "react";

/**
 * Met à jour l'attribut `lang` de <html> selon la locale courante.
 * Le root layout définit `lang="de"` par défaut (SSR);
 * ce composant le corrige côté client pour les pages /fr/.
 */
export default function LangSetter({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
