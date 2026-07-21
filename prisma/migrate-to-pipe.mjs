// Domipack — Migration : ApplicationStatus (legacy) → PipeStatus + champs CRM
//
// Ce script fait deux choses en une seule passe idempotente :
//   1. AVANT le `prisma db push` : dump les (id, status) des candidatures
//      existantes dans migration-snapshot.json (pour ne pas perdre l'info
//      quand la colonne `status` est droppée).
//   2. APRÈS le `prisma db push` : recharge le snapshot et UPDATE chaque
//      candidature avec :
//        - le `pipe` correspondant à l'ancien status
//        - des valeurs `city`/`zone`/`source` plausibles si elles manquent
//
// Usage :
//   node prisma/migrate-to-pipe.mjs dump     # avant db push
//   node prisma/migrate-to-pipe.mjs restore  # après db push
//
// Mapping ApplicationStatus → PipeStatus :
//   NEW       → nouveau
//   REVIEWED  → contacte
//   CONTACTED → encours
//   HIRED     → client   (+ validatedAt = createdAt)
//   REJECTED  → perdu

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, "migration-snapshot.json");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL manquant");
const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

const STATUS_TO_PIPE = {
  NEW: "nouveau",
  REVIEWED: "contacte",
  CONTACTED: "encours",
  HIRED: "client",
  REJECTED: "perdu",
};

// Pour enrichir les candidatures seeded sans city/zone.
const CITIES = [
  { city: "Lyon", zone: "Lyon Nord" },
  { city: "Lyon", zone: "Lyon Sud" },
  { city: "Paris", zone: "Paris Est" },
  { city: "Paris", zone: "Paris Ouest" },
  { city: "Marseille", zone: "Marseille Sud" },
  { city: "Nantes", zone: "Nantes Ouest" },
  { city: "Toulouse", zone: "Toulouse Centre" },
  { city: "Lille", zone: "Lille Métropole" },
  { city: "Bordeaux", zone: "Bordeaux Centre" },
  { city: "Strasbourg", zone: "Strasbourg Nord" },
  { city: "Rennes", zone: "Rennes Métropole" },
  { city: "Nice", zone: "Nice Côte d'Azur" },
];

async function dump() {
  console.log("→ Dump des candidatures actuelles...");
  // Lecture brute via $queryRaw car prisma client peut casser pendant la migration
  const rows = await prisma.$queryRawUnsafe(`
    SELECT id, status, "firstName", "lastName", "createdAt"
    FROM "Application"
    ORDER BY "createdAt" ASC
  `);
  const snapshot = rows.map((r) => ({
    id: r.id,
    legacyStatus: r.status,
    firstName: r.firstName,
    lastName: r.lastName,
    createdAt: r.createdAt,
  }));
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`✓ ${snapshot.length} candidatures dumpées dans ${SNAPSHOT_PATH}`);
}

async function restore() {
  if (!existsSync(SNAPSHOT_PATH)) {
    console.log("✗ Aucun snapshot trouvé. Rien à restaurer.");
    return;
  }
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  console.log(`→ Restauration du pipe pour ${snapshot.length} candidatures...`);

  let updated = 0;
  let enriched = 0;
  for (let i = 0; i < snapshot.length; i++) {
    const row = snapshot[i];
    const pipe = STATUS_TO_PIPE[row.legacyStatus] ?? "nouveau";
    const geo = CITIES[i % CITIES.length];

    // On suppose que les colonnes existent déjà (db push déjà joué)
    const data = {
      pipe,
      city: geo.city,
      zone: geo.zone,
      source: "Formulaire site",
    };

    // Si HIRED → client, on backdate validatedAt pour cohérence historique
    if (row.legacyStatus === "HIRED") {
      data.validatedAt = new Date(row.createdAt);
      data.relanceStop = "valide";
    }
    if (row.legacyStatus === "REJECTED") {
      data.relanceStop = "exclusion";
    }

    try {
      await prisma.application.update({
        where: { id: row.id },
        data,
      });
      updated++;
      enriched++;
    } catch (err) {
      console.warn(`  ⚠ Impossible de migrer ${row.id}: ${err.message}`);
    }
  }

  console.log(`✓ ${updated} candidatures migrées (${enriched} enrichies géographiquement).`);

  // Vérification : répartition par pipe
  const repartition = await prisma.application.groupBy({
    by: ["pipe"],
    _count: { _all: true },
  });
  console.log("→ Répartition par pipe :");
  for (const r of repartition) {
    console.log(`    ${r.pipe.padEnd(10)} : ${r._count._all}`);
  }
}

const cmd = process.argv[2];
try {
  if (cmd === "dump") {
    await dump();
  } else if (cmd === "restore") {
    await restore();
  } else {
    console.log("Usage: node prisma/migrate-to-pipe.mjs [dump|restore]");
    process.exit(1);
  }
} catch (e) {
  console.error("Erreur migration:", e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
