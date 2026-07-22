import { useTranslations } from "next-intl";
import Reveal from "@/components/ui/Reveal";

export default function Faq() {
  const t = useTranslations("faq");
  return (
    <section className="domipack-pad" id="faq">
      <div className="domipack-wrap">
        <Reveal
          as="div"
          className="section-head"
          style={{ margin: "0 auto 48px", textAlign: "center" }}
        >
          <span className="eyebrow" style={{ justifyContent: "center" }}>
            {t("eyebrow")}
          </span>
          <h2>{t("title")}</h2>
        </Reveal>
        <div className="faq">
          <details open className="reveal">
            <summary>
              {t("q1")}
              <span className="faq-flag">{t("flag1")}</span>
              <span className="plus">+</span>
            </summary>
            <p>{t("a1")}</p>
          </details>
          <details className="reveal">
            <summary>
              {t("q2")}
              <span className="plus">+</span>
            </summary>
            <p>{t("a2")}</p>
          </details>
          <details className="reveal">
            <summary>
              {t("q3")}
              <span className="plus">+</span>
            </summary>
            <p>{t("a3")}</p>
          </details>
          <details className="reveal">
            <summary>
              {t("q4")}
              <span className="plus">+</span>
            </summary>
            <p>{t("a4")}</p>
          </details>
          <details className="reveal">
            <summary>
              {t("q5")}
              <span className="plus">+</span>
            </summary>
            <p>{t("a5")}</p>
          </details>
        </div>
      </div>
    </section>
  );
}
