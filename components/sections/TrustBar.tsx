import { getTranslations } from "next-intl/server";

export default async function TrustBar() {
  const t = await getTranslations("trust");
  return (
    <div className="trust">
      <div className="domipack-wrap">
        <div className="chip">
          <span className="num">{t("fees.num")}</span>
          <div>
            {t("fees.label")}
            <small>{t("fees.small")}</small>
          </div>
        </div>
        <div className="chip">
          <span className="num">{t("contract.num")}</span>
          <div>
            {t("contract.label")}
            <small>{t("contract.small")}</small>
          </div>
        </div>
        <div className="chip">
          <span className="num">{t("home.num")}</span>
          <div>
            {t("home.label")}
            <small>{t("home.small")}</small>
          </div>
        </div>
        <div className="chip">
          <span className="num">{t("reply.num")}</span>
          <div>
            {t("reply.label")}
            <small>{t("reply.small")}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
