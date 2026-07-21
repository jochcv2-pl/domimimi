import { DefaultSession } from 'next-auth';

/**
 * Augmentation des types Auth.js v5 pour exposer `role` et `id`
 * sur session.user côté client et serveur.
 */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    id?: string;
  }
}
