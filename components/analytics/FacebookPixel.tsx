'use client';

import Script from 'next/script';
import { useEffect } from 'react';

/**
 * Facebook Pixel — injection du script Meta Pixel.
 *
 * Reçoit le pixel ID depuis le layout (server-side, lu en DB).
 * Si l'ID est vide, ne rend rien (pas de script injecté).
 *
 * Le pixel se charge une seule fois au mount, puis `pageview` est
 * déclenché à chaque changement de route (via useEffect + pathname).
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function FacebookPixel({ pixelId }: { pixelId: string | null }) {
  if (!pixelId) return null;

  return (
    <>
      <Script id="fb-pixel-init" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

/**
 * Hook pour déclencher PageView sur les navigations côté client.
 * À appeler dans le layout client wrapper si on veut le SPA routing.
 */
export function useFacebookPixelTrack(pixelId: string | null) {
  useEffect(() => {
    if (!pixelId || typeof window.fbq === 'undefined') return;
    window.fbq('track', 'PageView');
  }, [pixelId]);
}
