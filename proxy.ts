import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

/**
 * Proxy (anciennement middleware) Auth.js v5 — protège /admin/* ET /api/admin/*.
 * Redirige /admin vers /login si non authentifié (HTML response).
 * Renvoie 401 sur /api/admin/* si non authentifié ou non-admin (JSON-friendly).
 *
 * ⚠️ Ce fichier s'exécute sur l'Edge Runtime : il importe authConfig
 * (Edge-safe, SANS Prisma/bcrypt). La config complète (avec DB) reste
 * dans auth.ts, côté serveur.
 *
 * Defense-in-depth (audit Kyle fix #2, 2026-07-21) :
 * Le callback `authorized` d'authConfig vérifie session + rôle ADMIN/SUPER_ADMIN.
 * En plus du requireAdmin() serveur présent sur chaque route /api/admin/*,
 * ce middleware garantit qu'aucune route ne peut être atteinte par un non-admin.
 */
const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Protège :
  //  - /admin (pages HTML — redirect /login si non authentifié)
  //  - /api/admin (endpoints JSON — NextAuth renvoie 401 JSON)
  //  - /login (redirection si déjà connecté)
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/login',
  ],
};

