/**
 * Footer · pied de page Domipack.
 * Composant serveur (pas de 'use client').
 * Reproduit fidèlement le HTML de référence de la landing page.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Footer({ brandName = "domipackung", logoUrl }: { brandName?: string; logoUrl?: string | null }) {
  const t = await getTranslations("footer");
  return (
    <footer>
      <div className="domipack-wrap">
        <div className="foot-grid">
          <div style={{ maxWidth: "280px" }}>
            <div className="logo" style={{ marginBottom: "14px" }}>
              {logoUrl ? (
                <img src={logoUrl} alt={brandName} style={{ height: 28, width: "auto" }} />
              ) : (
                <>
                  <svg className="mark" viewBox="0 0 30 24" fill="none">
                    <path d="M2 7 15 1l13 6-13 6z" fill="#C08A5A" />
                    <path d="M2 7v10l13 6V13z" fill="#0F2019" />
                    <path d="M28 7v10l-13 6V13z" fill="#2C5344" />
                  </svg>
                  {brandName}
                </>
              )}
            </div>
            <p>{t("tagline")}</p>
          </div>
          <div>
            <h4>{t("col1.title", { brandName })}</h4>
            <a href="#avantages">{t("col1.link1")}</a>
            <a href="#etapes">{t("col1.link2")}</a>
            <a href="#profil">{t("col1.link3")}</a>
          </div>
          <div>
            <h4>{t("col2.title")}</h4>
            <a href="#postuler">{t("col2.link1")}</a>
            <a href="#faq">{t("col2.link2")}</a>
            <a href="#">{t("col2.link3")}</a>
          </div>
          <div>
            <h4>{t("col3.title")}</h4>
            <Link href="/mentions-legales">{t("col3.link1")}</Link>
            <Link href="/confidentialite">{t("col3.link2")}</Link>
            <Link href="/contact">{t("col3.link3")}</Link>
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
