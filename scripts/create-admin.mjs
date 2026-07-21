/**
 * Crée ou met à jour un compte admin Domipack.
 *
 * Usage :
 *   node --env-file=.env scripts/create-admin.mjs <email> <password> [role]
 *
 *   role : "super_admin" (défaut) ou "admin"
 *
 * Exemple :
 *   node --env-file=.env scripts/create-admin.mjs admin@mon-domaine.fr "MotDePasseFort2026!"
 *
 * Comportement :
 *   - Si l'email n'existe pas → crée un nouvel User avec passwordHash bcrypt (cost 12)
 *   - Si l'email existe déjà → met à jour le mot de passe et le rôle (upsert)
 *
 * Sécurité :
 *   - bcrypt cost 12 (recommandation OWASP 2023+)
 *   - Password jamais loggé, jamais retourné en clair
 *   - Email normalisé (lowercase + trim)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage : node --env-file=.env scripts/create-admin.mjs <email> <password> [role]');
  console.error('  role : "super_admin" (défaut) ou "admin"');
  process.exit(1);
}

const emailInput = args[0];
const password = args[1];
const roleInput = (args[2] ?? 'super_admin').toLowerCase();

// Validation du rôle
if (roleInput !== 'super_admin' && roleInput !== 'admin') {
  console.error(`Rôle invalide : "${roleInput}". Valeurs acceptées : super_admin | admin`);
  process.exit(1);
}

// Validation du mot de passe (garde-fou minimal)
if (password.length < 10) {
  console.error('Mot de passe trop court : minimum 10 caractères.');
  process.exit(1);
}

const email = emailInput.toLowerCase().trim();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL manquant — lancer avec --env-file=.env');
  process.exit(1);
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

const BCRYPT_COST = 12;

try {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const result = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: roleInput === 'super_admin' ? 'SUPER_ADMIN' : 'ADMIN',
    },
    create: {
      email,
      name: email.split('@')[0],
      passwordHash,
      role: roleInput === 'super_admin' ? 'SUPER_ADMIN' : 'ADMIN',
      emailVerified: new Date(),
    },
    select: { id: true, email: true, role: true },
  });

  console.log('✓ Compte admin prêt :');
  console.log(`    id    : ${result.id}`);
  console.log(`    email : ${result.email}`);
  console.log(`    role  : ${result.role}`);
  console.log('');
  console.log('→ Connectez-vous sur /login avec cet email + mot de passe.');
} catch (err) {
  console.error('Échec création admin :', err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
