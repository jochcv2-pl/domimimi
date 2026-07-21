import type { NextAuthConfig } from 'next-auth';

/**
 * auth.config.ts — configuration Edge-safe (sans Prisma, sans bcrypt).
 *
 * Ce fichier est importé par middleware.ts qui s'exécute sur l'Edge Runtime.
 * L'Edge Runtime ne supporte pas les modules Node natifs (node:util/types),
 * donc on garde ici UNIQUEMENT ce qui est compatible Edge :
 *   - pages de redirection
 *   - callback `authorized` (contrôle d'accès middleware)
 *   - callbacks jwt/session (manipulation de token, pas de DB)
 *
 * L'adapter Prisma et le Credentials Provider sont ajoutés dans auth.ts
 * (côté serveur, runtime Node.js).
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // Middleware (Edge-safe) : protège /admin/* en vérifiant session + rôle.
    // Defense-in-depth : même si une route oublie requireAdmin() serveur,
    // le middleware bloque les non-admin. Le rôle est lu depuis le JWT
    // (injecté par le callback jwt ci-dessous — disponible côté Edge).
    authorized: ({ auth, request }) => {
      const isLoggedIn = !!auth?.user;
      const role = (auth?.user as { role?: string } | undefined)?.role;
      const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
      const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
      const isLoginPage = request.nextUrl.pathname.startsWith('/login');

      // Déjà connecté sur /login → redirige vers /admin
      if (isLoginPage) {
        return !isLoggedIn;
      }
      // /admin requiert session active ET rôle admin (defense-in-depth).
      // Les routes API /api/admin/* sont elles aussi protégées ici, en plus
      // du check requireAdmin() serveur de chaque handler.
      if (isAdminPath) {
        return isLoggedIn && isAdmin;
      }
      return true;
    },
    // Injecte le rôle dans le JWT
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? 'ADMIN';
        token.id = user.id;
      }
      return token;
    },
    // Injecte le rôle + id dans la session côté client
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // ajoutés dans auth.ts (Credentials Provider côté serveur)
} satisfies NextAuthConfig;
