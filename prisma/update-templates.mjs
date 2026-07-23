// Domipack — Script : Met à jour les templates email (DE + FR)
//
// Usage : node prisma/update-templates.mjs
//
// Ce script upsert les templates par (name, locale).
// Ne touche pas aux autres données.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ============================================================
// Templates Allemand (locale = "de") — langue par défaut
// ============================================================

const DE_TEMPLATES = [
  {
    name: "Bestätigung der Bewerbung",
    locale: "de",
    trigger: "Candidature reçue · Agent Accueil",
    triggerKey: "accueil",
    agentKey: "accueil",
    subject: "Ihre Bewerbung ist bei uns eingegangen, {{Prénom}}",
    body: `Hallo {{Prénom}},

wir haben Ihre Bewerbung für die Heimverpackung im Gebiet {{Zone}} erhalten. Ihr Betreuer {{Prénom du référent}} prüft Ihr Profil und meldet sich innerhalb von 48 Stunden bei Ihnen. Es entstehen für Sie keinerlei Kosten.

Bis bald,
{{Prénom du référent}} — Rekrutierung, {{Nom de la marque}}`,
    status: "actif",
    sort: 1,
  },
  {
    name: "Auftragsangebot",
    locale: "de",
    trigger: "Mission validée · Agent Mission",
    triggerKey: "mission",
    agentKey: "mission",
    subject: "Ein Verpackungsauftrag wartet auf Sie, {{Prénom}}",
    body: `Gute Nachrichten, {{Prénom}}!

Ihr Auftrag: Gebiet {{Zone}}, Bezahlung {{Taux horaire}} pro Stunde.

Wenn dieses Angebot Sie interessiert, kontaktieren Sie einen Betreuer, um Ihre Anmeldung abzuschließen:`,
    status: "actif",
    sort: 2,
  },
  {
    name: "Rückmeldung 1",
    locale: "de",
    trigger: "J+3 sans réponse · Agent Relance",
    triggerKey: "relance_1",
    agentKey: "relance",
    subject: "{{Prénom}}, haben Sie unser Angebot gesehen?",
    body: `{{Prénom}},

konnten Sie unser Angebot für das Gebiet {{Zone}} schon ansehen? Keine Verpflichtung — ein kurzes Wort genügt, um darüber zu sprechen.`,
    status: "actif",
    sort: 3,
  },
  {
    name: "Rückmeldung 2",
    locale: "de",
    trigger: "J+6 sans réponse · Agent Relance",
    triggerKey: "relance_2",
    agentKey: "relance",
    subject: "{{Prénom}}, noch Fragen?",
    body: `{{Prénom}},

kurze Erinnerung: echter Vertrag, keine Kosten, Material wird Ihnen nach Hause geliefert und monatliche Bezahlung. Bei Fragen hören wir Ihnen gerne zu.`,
    status: "actif",
    sort: 4,
  },
  {
    name: "Letzte Erinnerung",
    locale: "de",
    trigger: "J+9 · dernière relance · Agent Relance",
    triggerKey: "relance_3",
    agentKey: "relance",
    subject: "{{Prénom}}, letzte Erinnerung",
    body: `{{Prénom}},

das ist unsere letzte Nachricht: ohne Antwort wird Ihre Bewerbung für das Gebiet {{Zone}} innerhalb von 24 Stunden geschlossen.

Wenn Sie fortfahren möchten, kontaktieren Sie uns:`,
    status: "actif",
    sort: 5,
  },
  {
    name: "Bewerbung akzeptiert",
    locale: "de",
    trigger: "Candidature acceptée",
    triggerKey: "validation",
    agentKey: null,
    subject: "Herzlichen Glückwunsch, {{Prénom}}! Ihre Bewerbung wurde akzeptiert",
    body: `Hallo {{Prénom}},

wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung bei {{Nom de la marque}} akzeptiert wurde!

Willkommen in unserem Team von Heimverpackungs-Partnern. Ihr Betreuer {{Prénom du référent}} wird sich in Kürze bei Ihnen melden, um Ihnen Ihre erste Mission zuzuweisen.

Bei Fragen können Sie uns jederzeit erreichen.`,
    status: "actif",
    sort: 6,
  },
  {
    name: "Mission zugewiesen",
    locale: "de",
    trigger: "Mission assignée",
    triggerKey: "mission_assigned",
    agentKey: null,
    subject: "Ihre Mission bei {{Nom de la marque}} – Zone {{Zone}}",
    body: `Hallo {{Prénom}},

wir haben Ihnen eine Mission zugewiesen.

Einsatzzone: {{Zone}}
Produkte: {{Produit}}
{{Mode de paie}}
{{Date de collecte}}

Bei Fragen antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen,
Ihr {{Nom de la marque}}-Team`,
    status: "actif",
    sort: 7,
  },
];

// ============================================================
// Templates Français (locale = "fr")
// ============================================================

const FR_TEMPLATES = [
  {
    name: "Confirmation de candidature",
    locale: "fr",
    trigger: "Candidature reçue · Agent Accueil",
    triggerKey: "accueil",
    agentKey: "accueil",
    subject: "Votre candidature est bien reçue, {{Prénom}}",
    body: `Bonjour {{Prénom}},

nous avons bien reçu votre candidature pour l'emballage à domicile dans la zone {{Zone}}. Votre référent {{Prénom du référent}} examine votre profil et vous contacte sous 48h. Aucun frais ne sera jamais à votre charge.

À très bientôt,
{{Prénom du référent}} — Recrutement, {{Nom de la marque}}`,
    status: "actif",
    sort: 1,
  },
  {
    name: "Proposition de mission",
    locale: "fr",
    trigger: "Mission validée · Agent Mission",
    triggerKey: "mission",
    agentKey: "mission",
    subject: "Une mission d'emballage vous attend, {{Prénom}}",
    body: `Bonnes nouvelles, {{Prénom}} !

Votre mission : zone {{Zone}}, rémunération {{Taux horaire}} de l'heure.

Si cette offre vous intéresse, contactez un référent pour finaliser votre inscription :`,
    status: "actif",
    sort: 2,
  },
  {
    name: "Relance 1",
    locale: "fr",
    trigger: "J+3 sans réponse · Agent Relance",
    triggerKey: "relance_1",
    agentKey: "relance",
    subject: "{{Prénom}}, avez-vous vu notre offre ?",
    body: `{{Prénom}},

avez-vous pu consulter notre offre pour la zone {{Zone}} ? Sans engagement — un mot suffit pour en discuter.`,
    status: "actif",
    sort: 3,
  },
  {
    name: "Relance 2",
    locale: "fr",
    trigger: "J+6 sans réponse · Agent Relance",
    triggerKey: "relance_2",
    agentKey: "relance",
    subject: "{{Prénom}}, des questions ?",
    body: `{{Prénom}},

petit rappel : vrai contrat, aucun frais, matériel livré chez vous et paiement mensuel. Si vous avez des questions, nous sommes là pour vous écouter.`,
    status: "actif",
    sort: 4,
  },
  {
    name: "Relance 3",
    locale: "fr",
    trigger: "J+9 · dernière relance · Agent Relance",
    triggerKey: "relance_3",
    agentKey: "relance",
    subject: "{{Prénom}}, dernier rappel",
    body: `{{Prénom}},

c'est notre dernier message : sans réponse, votre candidature pour la zone {{Zone}} sera clôturée sous 24h.

Si vous souhaitez continuer, contactez-nous :`,
    status: "actif",
    sort: 5,
  },
  {
    name: "Candidature acceptée",
    locale: "fr",
    trigger: "Candidature acceptée",
    triggerKey: "validation",
    agentKey: null,
    subject: "Félicitations, {{Prénom}} ! Votre candidature est acceptée",
    body: `Bonjour {{Prénom}},

nous sommes ravis de vous annoncer que votre candidature chez {{Nom de la marque}} a été acceptée !

Bienvenue dans notre équipe de partenaires d'emballage à domicile. Votre référent {{Prénom du référent}} vous contactera très prochainement pour vous attribuer votre première mission.

N'hésitez pas à nous contacter si vous avez la moindre question.`,
    status: "actif",
    sort: 6,
  },
  {
    name: "Mission assignée",
    locale: "fr",
    trigger: "Mission assignée",
    triggerKey: "mission_assigned",
    agentKey: null,
    subject: "Votre mission chez {{Nom de la marque}} – Zone {{Zone}}",
    body: `Bonjour {{Prénom}},

nous vous avons assigné une mission.

Zone d'intervention : {{Zone}}
Produits : {{Produit}}
{{Mode de paie}}
{{Date de collecte}}

En cas de questions, répondez simplement à cet e-mail.

Cordialement,
L'équipe {{Nom de la marque}}`,
    status: "actif",
    sort: 7,
  },
];

// ============================================================
// Upsert
// ============================================================

async function main() {
  const all = [...DE_TEMPLATES, ...FR_TEMPLATES];
  console.log(`Upserting ${all.length} templates (${DE_TEMPLATES.length} DE + ${FR_TEMPLATES.length} FR)...`);

  for (const t of all) {
    await prisma.emailTemplate.upsert({
      where: { name_locale: { name: t.name, locale: t.locale } },
      create: t,
      update: {
        trigger: t.trigger,
        triggerKey: t.triggerKey,
        agentKey: t.agentKey ?? null,
        subject: t.subject,
        body: t.body,
        status: t.status,
        sort: t.sort,
      },
    });
    console.log(`  ✓ ${t.locale.toUpperCase()} ${t.name}`);
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
