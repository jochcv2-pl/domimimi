import createIntlMiddleware from 'next-intl/middleware';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { routing } from '@/i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy combiné (Next.js 16 middleware) :
 *
 * 1. next-intl → détection de langue + préfixe de locale (/de/, /fr/)
 *    sur toutes les pages publiques.
 *
 * 2. NextAuth → protection /admin/*, /api/admin/*, /login
 *    (ces routes n'ont PAS de préfixe de locale).
 *
 * Le proxy inspecte le pathname et route vers le bon middleware.
 */

const intlMiddleware = createIntlMiddleware(routing);
const { auth: authProxy } = NextAuth(authConfig);

export default async function proxy(req: NextRequest): Promise<NextResponse | undefined> {
  const { pathname } = req.nextUrl;

  // Routes auth-protected (sans préfixe de locale) → NextAuth
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname === '/login'
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (authProxy as any)(req) as NextResponse | undefined;
  }

  // Pages publiques → next-intl (détection + rewrite de locale)
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Pages publiques — tout sauf api, _next, admin, login, fichiers statiques
    '/((?!api|_next|_vercel|admin|login|.*\\..*).*)',
    // Routes auth
    '/admin/:path*',
    '/api/admin/:path*',
    '/login',
  ],
};
