import { getTranslations } from "next-intl/server";
import { getBrandSettings } from "@/lib/brand";
import Reveal from "@/components/ui/Reveal";

export default async function Benefits() {
  const t = await getTranslations("benefits");
  const { brandName } = await getBrandSettings();
  return (
    <section className="domipack-pad" id="avantages">
      <div className="domipack-wrap">
        <Reveal as="div" className="section-head">
          <span className="eyebrow">{t("eyebrow", { brandName })}</span>
          <h2>{t("title")}</h2>
          <p>{t("intro")}</p>
        </Reveal>
        <div className="cards">
          <Reveal className="card">
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 6v6l4 2" stroke="#1E3A2F" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" stroke="#1E3A2F" strokeWidth="2" />
              </svg>
            </div>
            <h3>{t("card1.title")}</h3>
            <p>{t("card1.body")}</p>
          </Reveal>
          <Reveal className="card">
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="9" width="16" height="11" rx="2" stroke="#1E3A2F" strokeWidth="2" />
                <path d="M8 9V7a4 4 0 018 0v2" stroke="#1E3A2F" strokeWidth="2" />
              </svg>
            </div>
            <h3>{t("card2.title")}</h3>
            <p>{t("card2.body")}</p>
          </Reveal>
          <Reveal className="card">
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 12h16M4 12l4-4M4 12l4 4" stroke="#1E3A2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>{t("card3.title")}</h3>
            <p>{t("card3.body")}</p>
          </Reveal>
          <Reveal className="card">
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" stroke="#1E3A2F" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>{t("card4.title")}</h3>
            <p>{t("card4.body")}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
