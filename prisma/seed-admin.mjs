// Domipack — Seed Admin
// Crée le compte super-administrateur initial.
// Usage : pnpm db:seed-admin

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL manquant dans .env");
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

// Identifiants du super-admin initial — À CHANGER après la première connexion !
const ADMIN_EMAIL = "admin@domipack.fr";
const ADMIN_PASSWORD = "Domipack2026!";
const ADMIN_NAME = "Thomas Bernard";

async function main() {
  console.log("Seed Admin Domipack...");

  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    console.log(`Le compte ${ADMIN_EMAIL} existe déjà — seed ignoré.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log("══════════════════════════════════════════");
  console.log("  ✅ Super-administrateur créé");
  console.log("══════════════════════════════════════════");
  console.log(`  Email     : ${ADMIN_EMAIL}`);
  console.log(`  Mot de passe : ${ADMIN_PASSWORD}`);
  console.log(`  Rôle      : SUPER_ADMIN`);
  console.log("──────────────────────────────────────────");
  console.log("  ⚠️  Changez ce mot de passe après la");
  console.log("     première connexion en production.");
  console.log("══════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("Erreur seed admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
