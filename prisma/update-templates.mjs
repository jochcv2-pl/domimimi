// Domipack — Script : Met à jour uniquement les templates email en allemand
//
// Usage : node prisma/update-templates.mjs
// ou :   docker exec <APP_CONTAINER> node prisma/update-templates.mjs
//
// Ce script ne touche PAS aux candidatures, agents, settings, pay rates, etc.
// Il upsert uniquement les 6 templates email (crée ou met à jour par name).

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TEMPLATES = [
  {
    name: "Confirmation de candidature",
    trigger: "Candidature reçue · Agent Accueil",
    triggerKey: "accueil",
    agentKey: "accueil",
    subject: "Ihre Bewerbung ist bei uns eingegangen, {{Prénom}}",
    body: `Hallo {{Prénom}},

wir haben Ihre Bewerbung für die Heimbverpackung im Gebiet {{Zone}} erhalten. Ihr Betreuer {{Prénom du référent}} prüft Ihr Profil und meldet sich innerhalb von 48 Stunden bei Ihnen. Es werden Ihnen niemals Kosten entstehen.

Bis bald,
{{Prénom du référent}} — Recrutierung-Betreuer, {{Nom de la marque}}`,
    status: "actif",
    sort: 1,
  },
  {
    name: "Proposition de mission",
    trigger: "Mission validée · Agent Mission",
    triggerKey: "mission",
    agentKey: "mission",
    subject: "Ein Verpackungsauftrag wartet auf Sie, {{Prénom}}",
    body: `Gute Nachrichten, {{Prénom}}!

Ihr Auftrag: Gebiet {{Zone}}, Bezahlung {{Taux horaire}} pro Stunde.

Wenn dieses Angebot Sie interessiert, kontaktieren Sie einen Betreuer, um Ihre Anmeldung abzuschließen:
→ WhatsApp (grüner Button unten)
→ Messenger (blauer Button unten)

Bis bald,
{{Prénom du référent}} — Recrutierung-Betreuer, {{Nom de la marque}}`,
    status: "actif",
    sort: 2,
  },
  {
    name: "Relance 1 · rappel",
    trigger: "J+3 sans réponse · Agent Relance",
    triggerKey: "relance_1",
    agentKey: "relance",
    subject: "{{Prénom}}, haben Sie unser Angebot gesehen?",
    body: `{{Prénom}},

konnten Sie unser Angebot für das Gebiet {{Zone}} schon ansehen? Keine Verpflichtung — ein kurzes Wort genügt, um darüber zu sprechen.

→ Antworten Sie per WhatsApp oder Messenger (Buttons unten).

{{Prénom du référent}} — Recrutierung-Betreuer, {{Nom de la marque}}`,
    status: "actif",
    sort: 3,
  },
  {
    name: "Relance 2 · lever les doutes",
    trigger: "J+6 sans réponse · Agent Relance",
    triggerKey: "relance_2",
    agentKey: "relance",
    subject: "{{Prénom}}, noch Fragen?",
    body: `{{Prénom}},

kurze Erinnerung: echter Vertrag, keine Kosten, Material wird Ihnen nach Hause geliefert und monatliche Bezahlung. Wenn Sie Fragen haben, hören wir Ihnen gerne zu.

→ WhatsApp oder Messenger (Buttons unten).

{{Prénom du référent}} — Recrutierung-Betreuer, {{Nom de la marque}}`,
    status: "actif",
    sort: 4,
  },
  {
    name: "Relance 3 · dernière",
    trigger: "J+9 · letzte Erinnerung · Agent Relance",
    triggerKey: "relance_3",
    agentKey: "relance",
    subject: "{{Prénom}}, letzte Erinnerung",
    body: `{{Prénom}},

das ist unsere letzte Nachricht: ohne Antwort wird Ihre Bewerbung für das Gebiet {{Zone}} innerhalb von 24 Stunden geschlossen.

→ WhatsApp oder Messenger (Buttons unten), wenn Sie fortfahren möchten.

{{Prénom du référent}} — Recrutierung-Betreuer, {{Nom de la marque}}`,
    status: "actif",
    sort: 5,
  },
  {
    name: "Changement de référent",
    trigger: "Envoi manuel · —",
    agentKey: null,
    subject: "Ihr neuer Betreuer bei {{Nom de la marque}}",
    body: `Hallo {{Prénom}},

Ihr Betreuer hat sich geändert. Hier sind die neuen Kontaktdaten: {{Nouveau numéro}}.

Bis bald,
Das Team von {{Nom de la marque}}`,
    status: "brouillon",
    sort: 6,
  },
];

async function main() {
  let updated = 0;
  let created = 0;

  for (const t of TEMPLATES) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: t.name },
    });

    if (existing) {
      await prisma.emailTemplate.update({
        where: { name: t.name },
        data: t,
      });
      updated++;
    } else {
      await prisma.emailTemplate.create({ data: t });
      created++;
    }
  }

  console.log(`✓ ${TEMPLATES.length} templates traités (${updated} mis à jour, ${created} créés)`);
}

main()
  .catch((e) => {
    console.error("Erreur:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
