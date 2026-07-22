import { getTranslations } from "next-intl/server";
import Reveal from "@/components/ui/Reveal";

export default async function Testimonials() {
  const t = await getTranslations("testimonials");
  return (
    <section className="domipack-pad bg-sage">
      <div className="domipack-wrap">
        <Reveal className="section-head" as="div">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2>{t("title")}</h2>
        </Reveal>
        <div className="quotes">
          <Reveal className="quote">
            <div className="stars">★★★★★</div>
            <p>{t("quote1")}</p>
            <div className="who"><div className="avatar">SL</div><div><b>{t("name1")}</b><small>{t("role1")}</small></div></div>
          </Reveal>
          <Reveal className="quote">
            <div className="stars">★★★★★</div>
            <p>{t("quote2")}</p>
            <div className="who"><div className="avatar">KM</div><div><b>{t("name2")}</b><small>{t("role2")}</small></div></div>
          </Reveal>
          <Reveal className="quote">
            <div className="stars">★★★★★</div>
            <p>{t("quote3")}</p>
            <div className="who"><div className="avatar">DF</div><div><b>{t("name3")}</b><small>{t("role3")}</small></div></div>
          </Reveal>
        </div>
        <p style={{ textAlign: "center", marginTop: "26px", fontSize: ".82rem", color: "var(--pine-soft)" }}>{t("disclaimer")}</p>
      </div>
    </section>
  );
}
