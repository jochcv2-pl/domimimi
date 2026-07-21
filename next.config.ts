import type { NextConfig } from "next";

// ============================================================
// Headers de sécurité HTTP (audit Kyle — fix #1, 2026-07-21)
// ============================================================
// Appliqués sur toutes les routes via source: '/(.*)'.
// En mode report-only pour CSP : on observe avant d'imposer
// (durcissement progressif sans casser les scripts intégrés).
// ============================================================

const SECURITY_HEADERS = [
  // Anti-MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Anti-clickjacking (Next.js autorise déjà 'same-origin' par défaut,
  // DENY est plus strict — l'admin n'a pas vocation à être embarqué en iframe)
  { key: "X-Frame-Options", value: "DENY" },
  // Referrer limité à same-origin sur cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Verrouille les permissions navigateur (CRM n'a pas besoin de caméra/mic/geo)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS — 2 ans, includeSubDomains, preload. N'active que si HTTPS déployé.
  // En dev local (HTTP), ce header est ignoré par le navigateur.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // CSP enforcement (était Report-Only pendant la phase d'observation).
  // 'unsafe-inline' sur script-src/style-src reste nécessaire car Next.js
  // injecte du CSS inline runtime. Pour durcir à nonce-based, il faudrait
  // un middleware qui génère un nonce par requête — reporté.
  // Le endpoint /api/csp-report reste actif pour capturer les violations.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "report-uri /api/csp-report",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Build standalone pour Docker (Next.js génère server.js autonome
  // sans node_modules complet — image finale ~150MB au lieu de ~1GB)
  output: "standalone",

  // Anti-fingerprinting : masque le header X-Powered-By: Next.js
  poweredByHeader: false,

  // `nodemailer` n'est installé que si le provider SMTP est utilisé.
  // On le déclare en external server pour que webpack ne tente pas de
  // le bundler au build : l'import dynamique dans lib/email/providers.ts
  // gère proprement le cas où le module n'existe pas.
  serverExternalPackages: ["nodemailer"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
