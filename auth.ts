import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';

/**
 * Auth.js v5 — configuration SERVEUR (runtime Node.js).
 *
 * Étend authConfig (Edge-safe) avec :
 *  - l'adapter Prisma (accès DB — impossible côté Edge)
 *  - le Credentials Provider (vérification bcrypt)
 *
 * Stratégie : JWT (obligatoire avec le Credentials Provider).
 *
 * Sécurité :
 *  - Mots de passe hashés via bcrypt (cost ≥ 12).
 *  - Cookie httpOnly sécurisé géré par Auth.js.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
