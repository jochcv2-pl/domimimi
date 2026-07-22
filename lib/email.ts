// Domipack — Service de notification email
// Envoi une notification à l'admin à chaque nouvelle candidature.
// Provider/credentials lus depuis la DB (admin) en priorité, puis .env en fallback.

import type { Application } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotificationPayload = Pick<
  Application,
  "id" | "firstName" | "lastName" | "email" | "phone" | "postalCode" | "createdAt"
>;

export interface EmailProviderConfig {
  provider: "none" | "resend" | "brevo" | "smtp";
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  resendApiKey: string;
  brevoApiKey: string;
  notifyTo: string;
}

/**
 * Charge la configuration email depuis la DB (admin-configurable).
 * Fallback sur les variables d'environnement si le setting DB est vide.
 * Cache 60s pour éviter une requête DB à chaque notification.
 */
let emailConfigCache: { data: EmailProviderConfig; ts: number } | null = null;
const CACHE_TTL = 60_000;

export async function getEmailConfig(): Promise<EmailProviderConfig> {
  if (emailConfigCache && Date.now() - emailConfigCache.ts < CACHE_TTL) {
    return emailConfigCache.data;
  }

  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "email.provider_active",
            "email.smtp_host",
            "email.smtp_port",
            "email.smtp_user",
            "email.smtp_pass",
            "email.resend_api_key",
            "email.brevo_api_key",
            "email.notify_to",
          ],
        },
      },
      select: { key: true, value: true },
    });

    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    const data: EmailProviderConfig = {
      provider: (map["email.provider_active"] as EmailProviderConfig["provider"]) || "none",
      smtpHost: map["email.smtp_host"] || process.env.EMAIL_SMTP_HOST || "",
      smtpPort: map["email.smtp_port"] || process.env.EMAIL_SMTP_PORT || "587",
      smtpUser: map["email.smtp_user"] || process.env.EMAIL_SMTP_USER || "",
      smtpPass: map["email.smtp_pass"] || process.env.EMAIL_SMTP_PASSWORD || "",
      resendApiKey: map["email.resend_api_key"] || process.env.EMAIL_RESEND_API_KEY || "",
      brevoApiKey: map["email.brevo_api_key"] || process.env.EMAIL_BREVO_API_KEY || "",
      notifyTo: map["email.notify_to"] || process.env.NOTIFY_EMAIL_TO || "",
    };

    emailConfigCache = { data, ts: Date.now() };
    return data;
  } catch {
    // Fallback complet sur env si DB indisponible
    return {
      provider: (process.env.EMAIL_PROVIDER as EmailProviderConfig["provider"]) || "none",
      smtpHost: process.env.EMAIL_SMTP_HOST || "",
      smtpPort: process.env.EMAIL_SMTP_PORT || "587",
      smtpUser: process.env.EMAIL_SMTP_USER || "",
      smtpPass: process.env.EMAIL_SMTP_PASSWORD || "",
      resendApiKey: process.env.EMAIL_RESEND_API_KEY || "",
      brevoApiKey: process.env.EMAIL_BREVO_API_KEY || "",
      notifyTo: process.env.NOTIFY_EMAIL_TO || "",
    };
  }
}

/**
 * Envoie une notification email à l'équipe recrutement quand une
 * nouvelle candidature arrive. Non bloquant : si pas de provider configuré,
 * on log en console.
 */
export async function sendApplicationNotification(app: NotificationPayload): Promise<void> {
  const config = await getEmailConfig();
  const to = config.notifyTo || "recrutement@domipack.fr";

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

  if (config.provider === "none" || !config.smtpHost && !config.resendApiKey && !config.brevoApiKey) {
    console.log(`[email] Aucun provider configuré — notification en console uniquement`);
    console.log(`[email] To: ${to}`);
    console.log(`[email] Subject: ${subject}`);
    console.log(`[email] Body: ${text}`);
    return;
  }

  // TODO: implémenter l'envoi réel selon le provider (resend / brevo / smtp)
  console.log(`[email] Provider "${config.provider}" configuré mais envoi pas encore implémenté`);
  console.log(`[email] To: ${to}`);
  console.log(`[email] Subject: ${subject}`);
}
