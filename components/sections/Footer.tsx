/**
 * Footer · pied de page.
 * Composant serveur. Lit les settings CMS (footer.*) avec fallback i18n.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getFooterSettings } from "@/lib/brand";

export default async function Footer({ brandName = "domipackung", logoUrl }: { brandName?: string; logoUrl?: string | null }) {
  const t = await getTranslations("footer");
  const fs = await getFooterSettings();

  const tagline = fs.tagline ?? t("tagline");

  const col1Title = fs.col1Title ?? t("col1.title", { brandName });
  const col1Links = fs.col1Links ?? [t("col1.link1"), t("col1.link2"), t("col1.link3")];

  const col2Title = fs.col2Title ?? t("col2.title");
  const col2Links = fs.col2Links ?? [t("col2.link1"), t("col2.link2"), t("col2.link3")];

  const col3Title = fs.col3Title ?? t("col3.title");
  const col3Links = fs.col3Links ?? [t("col3.link1"), t("col3.link2"), t("col3.link3")];

  return (
    <footer>
      <div className="domipack-wrap">
        <div className="foot-grid">
          <div style={{ maxWidth: "280px" }}>
            <div className="logo" style={{ marginBottom: "14px" }}>
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} style={{ height: 28, width: "auto" }} />
              ) : (
                <svg className="mark" viewBox="0 0 30 24" fill="none">
                  <path d="M2 7 15 1l13 6-13 6z" fill="#C08A5A" />
                  <path d="M2 7v10l13 6V13z" fill="#0F2019" />
                  <path d="M28 7v10l-13 6V13z" fill="#2C5344" />
                </svg>
              )}
              {brandName}
            </div>
            <p>{tagline}</p>
          </div>
          <div>
            <h4>{col1Title}</h4>
            {col1Links[0] && <a href="#avantages">{col1Links[0]}</a>}
            {col1Links[1] && <a href="#etapes">{col1Links[1]}</a>}
            {col1Links[2] && <a href="#profil">{col1Links[2]}</a>}
          </div>
          <div>
            <h4>{col2Title}</h4>
            {col2Links[0] && <a href="#postuler">{col2Links[0]}</a>}
            {col2Links[1] && <a href="#faq">{col2Links[1]}</a>}
            {col2Links[2] && <a href="#">{col2Links[2]}</a>}
          </div>
          <div>
            <h4>{col3Title}</h4>
            {col3Links[0] && <Link href="/mentions-legales">{col3Links[0]}</Link>}
            {col3Links[1] && <Link href="/confidentialite">{col3Links[1]}</Link>}
            {col3Links[2] && <Link href="/contact">{col3Links[2]}</Link>}
          </div>
        </div>
        <div className="foot-bottom">
          <span>
            {t("copyright", { brandName })}
          </span>
          <span>{t("madeWith")}</span>
        </div>
      </div>
    </footer>
  );
}
