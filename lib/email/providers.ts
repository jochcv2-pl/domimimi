/**
 * Pipeline email — providers unifiés.
 *
 * Trois providers supportés : Resend, Brevo, SMTP. Tous exposent la même
 * interface {@link EmailProvider} afin que le moteur reste agnostique du
 * transport. Le provider actif est sélectionné depuis le setting DB
 * `email.provider_active` ; les credentials restent dans `.env`
 * (décision `domipack.cred_in_env_only`).
 *
 *   - Resend : API REST, header `Authorization: Bearer ${RESEND_API_KEY}`
 *   - Brevo  : API REST, header `api-key: ${BREVO_API_KEY}`
 *   - SMTP   : transport nodemailer (`nodemailer.createTransport`)
 *
 * Aucun provider ne lève en cas d'erreur réseau — il renvoie `{ ok: false,
 * error }` pour que le moteur logge et continue la file.
 */

export type EmailProviderName = "resend" | "brevo" | "smtp";

export interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailSuccess {
  ok: true;
  messageId?: string;
  provider: EmailProviderName;
}

export interface SendEmailFailure {
  ok: false;
  provider: EmailProviderName;
  error: string;
  /** true si l'erreur est temporaire (5xx, timeout) → retry possible */
  retryable: boolean;
}

export type SendEmailResult = SendEmailSuccess | SendEmailFailure;

export interface EmailProvider {
  name: EmailProviderName;
  /** Indique si les variables d'environnement requises sont présentes. */
  isConfigured(): boolean;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

// ============================================================
// Resend — https://resend.com/docs/api-reference/emails/send-email
// ============================================================

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const resendProvider: EmailProvider = {
  name: "resend",

  isConfigured() {
    return Boolean(process.env.EMAIL_RESEND_API_KEY);
  },

  async send(input) {
    const apiKey = process.env.EMAIL_RESEND_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        provider: "resend",
        error: "EMAIL_RESEND_API_KEY manquant dans .env",
        retryable: false,
      };
    }
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: input.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          provider: "resend",
          error: `Resend ${res.status}: ${body.slice(0, 500)}`,
          retryable: res.status >= 500,
        };
      }

      const json = (await res.json().catch(() => ({}))) as { id?: string };
      return {
        ok: true,
        provider: "resend",
        messageId: json.id,
      };
    } catch (err) {
      return {
        ok: false,
        provider: "resend",
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
      };
    }
  },
};

// ============================================================
// Brevo — https://developers.brevo.com/reference/sendtransacemail
// ============================================================

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const brevoProvider: EmailProvider = {
  name: "brevo",

  isConfigured() {
    return Boolean(process.env.EMAIL_BREVO_API_KEY);
  },

  async send(input) {
    const apiKey = process.env.EMAIL_BREVO_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        provider: "brevo",
        error: "EMAIL_BREVO_API_KEY manquant dans .env",
        retryable: false,
      };
    }
    try {
      const res = await fetch(BREVO_ENDPOINT, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { email: input.from },
          to: [{ email: input.to }],
          subject: input.subject,
          htmlContent: input.html,
          textContent: input.text,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          provider: "brevo",
          error: `Brevo ${res.status}: ${body.slice(0, 500)}`,
          retryable: res.status >= 500,
        };
      }

      const json = (await res.json().catch(() => ({}))) as { messageId?: string };
      return {
        ok: true,
        provider: "brevo",
        messageId: json.messageId,
      };
    } catch (err) {
      return {
        ok: false,
        provider: "brevo",
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
      };
    }
  },
};

// ============================================================
// SMTP — via nodemailer (chargé dynamiquement pour rester optionnel)
// ============================================================

const smtpProvider: EmailProvider = {
  name: "smtp",

  isConfigured() {
    return Boolean(
      process.env.EMAIL_SMTP_HOST &&
        process.env.EMAIL_SMTP_USER &&
        process.env.EMAIL_SMTP_PASSWORD,
    );
  },

  async send(input) {
    const host = process.env.EMAIL_SMTP_HOST;
    const user = process.env.EMAIL_SMTP_USER;
    const pass = process.env.EMAIL_SMTP_PASSWORD;
    if (!host || !user || !pass) {
      return {
        ok: false,
        provider: "smtp",
        error: "EMAIL_SMTP_HOST/USER/PASSWORD manquants dans .env",
        retryable: false,
      };
    }
    try {
      // nodemailer est importé dynamiquement : si le provider SMTP n'est
      // jamais utilisé, on n'a pas besoin de l'avoir installé.
      const nodemailer = await import("nodemailer").catch(() => null);
      if (!nodemailer || !("createTransport" in nodemailer)) {
        return {
          ok: false,
          provider: "smtp",
          error:
            "nodemailer n'est pas installé. Lance `pnpm add nodemailer && pnpm add -D @types/nodemailer`.",
          retryable: false,
        };
      }
      const port = Number.parseInt(process.env.EMAIL_SMTP_PORT ?? "587", 10);
      const secure = port === 465;
      const transport = nodemailer.createTransport({
        host,
        port: Number.isFinite(port) ? port : 587,
        secure,
        auth: { user, pass },
      });
      const info = await transport.sendMail({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      try {
        await transport.close();
      } catch {
        /* ignore close error */
      }
      return {
        ok: true,
        provider: "smtp",
        messageId: info?.messageId,
      };
    } catch (err) {
      return {
        ok: false,
        provider: "smtp",
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
      };
    }
  },
};

// ============================================================
// Registry + factory
// ============================================================

const PROVIDERS: Record<EmailProviderName, EmailProvider> = {
  resend: resendProvider,
  brevo: brevoProvider,
  smtp: smtpProvider,
};

/**
 * Retourne le provider demandé. Lève si le nom est inconnu — c'est un
 * bug de configuration (le setting DB ne devrait contenir que des noms
 * valides).
 */
export function getProvider(name: string): EmailProvider {
  if (!(name in PROVIDERS)) {
    throw new Error(
      `Provider email inconnu : "${name}". Attendu : resend | brevo | smtp.`,
    );
  }
  return PROVIDERS[name as EmailProviderName];
}

/** Liste tous les providers avec leur statut de configuration (.env). */
export function listProviders(): Array<{
  name: EmailProviderName;
  configured: boolean;
}> {
  return (Object.keys(PROVIDERS) as EmailProviderName[]).map((name) => ({
    name,
    configured: PROVIDERS[name].isConfigured(),
  }));
}
