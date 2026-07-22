import { getTranslations } from "next-intl/server";
import Reveal from "@/components/ui/Reveal";

export default async function Steps() {
  const t = await getTranslations("steps");
  return (
    <section className="domipack-pad bg-sage" id="etapes">
      <div className="domipack-wrap">
        <Reveal className="section-head">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2>{t("title")}</h2>
          <p>{t("intro")}</p>
        </Reveal>
        <div className="steps">
          <Reveal className="step">
            <div className="no">1</div>
            <h3>{t("step1.title")}</h3>
            <p>{t("step1.body")}</p>
          </Reveal>
          <Reveal className="step">
            <div className="no">2</div>
            <h3>{t("step2.title")}</h3>
            <p>{t("step2.body")}</p>
          </Reveal>
          <Reveal className="step">
            <div className="no">3</div>
            <h3>{t("step3.title")}</h3>
            <p>{t("step3.body")}</p>
          </Reveal>
          <Reveal className="step">
            <div className="no">4</div>
            <h3>{t("step4.title")}</h3>
            <p>{t("step4.body")}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
