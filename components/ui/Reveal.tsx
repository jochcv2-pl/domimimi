"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Reveal · wrapper client qui déclenche l'animation scroll-reveal
 * via IntersectionObserver. Reproduit le comportement du fichier
 * HTML de référence : opacity + translateY au scroll.
 */
export default function Reveal({
  children,
  className = "",
  as: Tag = "div",
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Component = Tag as React.ElementType;
  return (
    <Component ref={ref} className={`reveal ${className}`} style={style}>
      {children}
    </Component>
  );
}
