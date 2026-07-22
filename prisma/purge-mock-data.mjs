/**
 * purge-mock-data.mjs
 *
 * Supprime toutes les données mockées (candidatures, emails, notes, audits SEO)
 * en conservant le compte admin, la grille de rémunération, les modèles d'emails,
 * les agents IA et les paramètres.
 *
 * Utilisation : node prisma/purge-mock-data.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL manquant dans .env");
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("━".repeat(50));
  console.log("  PURGE DES DONNÉES MOCKÉES");
  console.log("━".repeat(50));

  // 1. EmailLog (dépend de Application via FK + onDelete:Cascade)
  const emailLogs = await prisma.emailLog.count();
  console.log(`EmailLog       : ${emailLogs} lignes → suppression`);
  await prisma.emailLog.deleteMany({});

  // 2. ApplicationNote (dépend de Application via FK + onDelete:Cascade)
  const notes = await prisma.applicationNote.count();
  console.log(`ApplicationNote: ${notes} lignes → suppression`);
  await prisma.applicationNote.deleteMany({});

  // 3. Application (candidatures mockées)
  const apps = await prisma.application.count();
  console.log(`Application    : ${apps} lignes → suppression`);
  await prisma.application.deleteMany({});

  // 4. SeoAudit (audits mockés)
  const audits = await prisma.seoAudit.count();
  console.log(`SeoAudit       : ${audits} lignes → suppression`);
  await prisma.seoAudit.deleteMany({});

  // 5. Testimonial (si la table existe — ajouté récemment)
  try {
    const testimonials = await prisma.testimonial.count();
    console.log(`Testimonial    : ${testimonials} lignes → suppression`);
    await prisma.testimonial.deleteMany({});
  } catch {
    console.log("Testimonial    : table inexistante (ignoré)");
  }

  console.log("─".repeat(50));

  // Vérification de ce qui reste
  const users = await prisma.user.count();
  const payRates = await prisma.payRate.count();
  const templates = await prisma.emailTemplate.count();
  const agents = await prisma.agent.count();
  const settings = await prisma.setting.count();

  console.log("  DONNÉES CONSERVÉES :");
  console.log(`    User          : ${users} (compte admin)`);
  console.log(`    PayRate       : ${payRates} (grille de rémunération)`);
  console.log(`    EmailTemplate : ${templates} (modèles d'emails)`);
  console.log(`    Agent         : ${agents} (agents IA)`);
  console.log(`    Setting       : ${settings} (paramètres CMS/contact)`);

  console.log("─".repeat(50));
  console.log("  PURGE TERMINÉE");
  console.log("━".repeat(50));
}

main()
  .catch((e) => {
    console.error("Erreur lors de la purge :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
