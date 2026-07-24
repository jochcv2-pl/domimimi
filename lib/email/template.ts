/**
 * Template HTML email — wrapper responsive et professionnel.
 *
 * Produit un document HTML complet (DOCTYPE, head, body) avec :
 *   - Header modifiable (brand text, logo, couleur de fond, tagline)
 *   - Barre d'accent (couleur secondaire)
 *   - Zone de contenu (body rendu par render.ts)
 *   - Boutons WhatsApp/Messenger (si URLs configurés)
 *   - Footer modifiable (société, slogan, adresse, email, téléphone, mentions légales, site web)
 *
 * Tout est inline CSS (compatibilité email clients).
 * Responsive : 600px max-width, media queries pour mobile.
 */

export interface EmailHeaderConfig {
  brand: string;
  logoUrl: string | null;
  bgColor: string;
  tagline: string;
}

export interface EmailFooterConfig {
  companyName: string;
  tagline: string;
  address: string;
  email: string;
  phone: string;
  legal: string;
  website: string;
}

export const DEFAULT_HEADER: EmailHeaderConfig = {
  brand: "domipackung",
  logoUrl: null,
  bgColor: "#0F2019",
  tagline: "",
};

export const DEFAULT_FOOTER: EmailFooterConfig = {
  companyName: "domipackung",
  tagline: "Heimverpackung & Logistik",
  address: "",
  email: "",
  phone: "",
  legal:
    "Diese E-Mail wurde automatisch versendet. Bitte antworten Sie nicht auf diese Nachricht. Ihre Daten werden gemäß DSGVO verarbeitet.",
  website: "",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Construit le HTML complet d'un email à partir du body et des configs.
 */
export function buildEmailHtml(
  bodyText: string,
  header: EmailHeaderConfig,
  footer: EmailFooterConfig,
  whatsappUrl?: string,
  messengerUrl?: string,
): string {
  const brandLabel = escapeHtml(header.brand);

  // Logo ou texte
  const logoHtml = header.logoUrl
    ? `<img src="${escapeHtml(header.logoUrl)}" alt="${brandLabel}" style="height:34px;width:auto;display:block;" />`
    : `<span style="font-size:22px;font-weight:800;color:#C8A87E;letter-spacing:0.5px;">${brandLabel}</span>`;

  // Tagline sous le logo
  const taglineHtml = header.tagline
    ? `<p style="margin:6px 0 0 0;font-size:12px;color:rgba(255,255,255,0.6);font-weight:400;letter-spacing:0.3px;">${escapeHtml(header.tagline)}</p>`
    : "";

  // Convertir le texte du body en paragraphes HTML
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

  // Boutons de contact
  let buttonsHtml = "";
  if (whatsappUrl || messengerUrl) {
    const btns: string[] = [];
    if (whatsappUrl) {
      btns.push(
        `<a href="${escapeHtml(whatsappUrl)}" style="display:inline-block;padding:13px 28px;background:#25D366;color:#ffffff !important;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;margin:0 6px 8px 0;font-family:Arial,Helvetica,sans-serif;">WhatsApp</a>`,
      );
    }
    if (messengerUrl) {
      btns.push(
        `<a href="${escapeHtml(messengerUrl)}" style="display:inline-block;padding:13px 28px;background:#0084FF;color:#ffffff !important;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;margin:0 6px 8px 0;font-family:Arial,Helvetica,sans-serif;">Messenger</a>`,
      );
    }
    buttonsHtml = `
          <tr>
            <td style="padding:20px 0 6px 0;text-align:center;">
              ${btns.join("")}
            </td>
          </tr>`;
  }

  // Footer — coordonnées
  const contactParts: string[] = [];
  if (footer.address) contactParts.push(escapeHtml(footer.address));
  if (footer.email)
    contactParts.push(
      `<a href="mailto:${escapeHtml(footer.email)}" style="color:#6B7A72;text-decoration:none;">${escapeHtml(footer.email)}</a>`,
    );
  if (footer.phone) contactParts.push(escapeHtml(footer.phone));
  const contactHtml =
    contactParts.length > 0
      ? `<p style="margin:0 0 8px 0;font-size:12px;color:#6B7A72;line-height:1.6;">${contactParts.join(" &nbsp;·&nbsp; ")}</p>`
      : "";

  const websiteHtml = footer.website
    ? `<p style="margin:0 0 8px 0;font-size:12px;"><a href="${escapeHtml(footer.website)}" style="color:#2C5344;text-decoration:none;font-weight:600;">${escapeHtml(footer.website)}</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${brandLabel}</title>
  <style>
    @media only screen and (max-width:600px){
      .email-card{border-radius:0 !important;}
      .email-body{padding:24px 20px !important;}
      .email-header{padding:20px 16px !important;}
      .email-footer{padding:20px 16px !important;}
      .btn-contact{display:block !important;width:100% !important;margin:0 0 8px 0 !important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#EAEEE8;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EAEEE8;min-height:100vh;">
    <tr>
      <td align="center" style="padding:28px 12px;">

        <table role="presentation" class="email-card" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,32,25,0.08);">

          <!-- HEADER -->
          <tr>
            <td class="email-header" style="background:${escapeHtml(header.bgColor)};padding:26px 30px;text-align:center;">
              ${logoHtml}
              ${taglineHtml}
            </td>
          </tr>

          <!-- ACCENT BAR -->
          <tr>
            <td style="height:4px;background:#2C5344;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="email-body" style="padding:34px 30px 10px 30px;font-size:15px;line-height:1.7;color:#1f2933;">
              ${paragraphs}
            </td>
          </tr>
${buttonsHtml}
          <!-- FOOTER -->
          <tr>
            <td class="email-footer" style="padding:26px 30px 32px 30px;background:#F7F8F4;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:2px solid #E0E4DC;padding-top:22px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#2C5344;">${escapeHtml(footer.companyName)}</p>
                    ${footer.tagline ? `<p style="margin:0 0 10px 0;font-size:12px;color:#95A198;">${escapeHtml(footer.tagline)}</p>` : ""}
                    ${contactHtml}
                    ${websiteHtml}
                    <p style="margin:14px 0 0 0;font-size:11px;color:#95A198;line-height:1.6;border-top:1px solid #E0E4DC;padding-top:12px;">
                      ${escapeHtml(footer.legal)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Copyright -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:16px 0;text-align:center;">
              <p style="margin:0;font-size:10px;color:#B0B8AE;">
                &copy; ${new Date().getFullYear()} ${brandLabel}
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
