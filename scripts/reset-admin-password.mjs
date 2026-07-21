/**
 * Réinitialise le mot de passe d'un compte admin existant.
 *
 * Usage :
 *   node --env-file=.env scripts/reset-admin-password.mjs <email> <nouveauPassword>
 *
 * Exemple :
 *   node --env-file=.env scripts/reset-admin-password.mjs admin@mon-domaine.fr "NouveauMotDePasseFort!"
 *
 * Comportement :
 *   - Si l'email existe → met à jour passwordHash (bcrypt cost 12)
 *   - Si l'email n'existe pas → erreur explicite
 *
 * Sécurité :
 *   - bcrypt cost 12
 *   - Password jamais loggé
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage : node --env-file=.env scripts/reset-admin-password.mjs <email> <nouveauPassword>');
  process.exit(1);
}

const email = args[0].toLowerCase().trim();
const password = args[1];

if (password.length < 10) {
  console.error('Mot de passe trop court : minimum 10 caractères.');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL manquant — lancer avec --env-file=.env');
  process.exit(1);
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

const BCRYPT_COST = 12;

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    console.error(`Aucun compte trouvé pour "${email}".`);
    console.error('→ Pour créer un nouveau compte, utilisez scripts/create-admin.mjs');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.user.update({
    where: { email },
    data: { passwordHash },
    select: { id: true },
  });

  console.log('✓ Mot de passe réinitialisé :');
  console.log(`    email : ${email}`);
  console.log(`    cost  : bcrypt ${BCRYPT_COST}`);
  console.log('');
  console.log('→ L\'ancien mot de passe ne fonctionne plus. Connectez-vous avec le nouveau.');
} catch (err) {
  console.error('Échec reset password :', err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
