// Domipack — Service de notification email
// Envoi une notification à l'admin à chaque nouvelle candidature
// Si SMTP_URL n'est pas configuré, log seulement en console (dev)

import type { Application } from "@prisma/client";

type NotificationPayload = Pick<
  Application,
  "id" | "firstName" | "lastName" | "email" | "phone" | "postalCode" | "createdAt"
>;

/**
 * Envoie une notification email à l'équipe recrutement quand une
 * nouvelle candidature arrive. Non bloquant : si pas de SMTP configuré,
 * on log en console.
 */
export async function sendApplicationNotification(app: NotificationPayload): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  const to = process.env.NOTIFY_EMAIL_TO || "recrutement@domipack.fr";

  const subject = `Nouvelle candidature — ${app.firstName} ${app.lastName}`;
  const text = [
    `Nouvelle candidature reçue le ${app.createdAt.toLocaleString("fr-FR")}`,
    ``,
    `Nom : ${app.firstName} ${app.lastName}`,
    `Email : ${app.email}`,
    `Téléphone : ${app.phone || "non renseigné"}`,
    `Code postal : ${app.postalCode}`,
    `ID : ${app.id}`,
  ].join("\n");

  if (!smtpUrl) {
    console.log(`[email] SMTP non configuré — notification en console uniquement`);
    console.log(`[email] To: ${to}`);
    console.log(`[email] Subject: ${subject}`);
    console.log(`[email] Body: ${text}`);
    return;
  }

  // TODO: implémenter l'envoi SMTP réel quand SMTP_URL sera configuré
  // Pour l'instant, on log
  console.log(`[email] SMTP configuré mais envoi pas encore implémenté`);
  console.log(`[email] To: ${to}`);
  console.log(`[email] Subject: ${subject}`);
}
