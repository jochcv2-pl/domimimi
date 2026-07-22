'use client';

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Reveal from "@/components/ui/Reveal";

// ============================================================
// Récupère la grille de rémunération publique pour afficher
// le taux horaire minimum ("Dès X €/h"). Une seule source de vérité :
// la grille éditée depuis le CRM admin (décision crm.remuneration.single_source).
// ============================================================

type PayRate = {
  type: string;
  mode: string | null;
  label: string;
  amount: number;
  unit: string;
};

function formatHourly(n: number): string {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProfilePay() {
  const t = useTranslations("profilePay");
  const [minRate, setMinRate] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pay-rates", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const rates: PayRate[] = json?.rates ?? [];
        const hourly = rates
          .filter((r) => r.type === "base" && r.mode === "hourly")
          .map((r) => r.amount);
        if (!cancelled) {
          setMinRate(hourly.length > 0 ? Math.min(...hourly) : null);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const display = minRate !== null ? `${t("pricePrefix")} ${formatHourly(minRate)}` : t("priceFallback");
  const isLive = loaded && minRate !== null;

  return (
    <section className="domipack-pad" id="profil">
      <div className="domipack-wrap split">
        <Reveal>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2
            style={{
              fontSize: "clamp(1.9rem,3.4vw,2.6rem)",
              margin: "14px 0 26px",
            }}
          >
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </h2>
          <ul className="checklist">
            <li>
              <span className="tick">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#FCFBF7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>{t("check1")}</div>
            </li>
            <li>
              <span className="tick">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#FCFBF7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>{t("check2")}</div>
            </li>
            <li>
              <span className="tick">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#FCFBF7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>{t("check3")}</div>
            </li>
            <li>
              <span className="tick">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#FCFBF7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>{t("check4")}</div>
            </li>
          </ul>
        </Reveal>

        <Reveal className="panel">
          <h3>{t("panelTitle")}</h3>
          <p style={{ color: "#C6D5CC" }}>
            {t("panelIntro")}
          </p>
          <div className="price">
            {display} €<small> {t("priceUnit")}</small>
          </div>
          <ul>
            <li>{t("bullet1")}</li>
            <li>{t("bullet2")}</li>
            <li>{t("bullet3")}</li>
            <li>{t("bullet4")}</li>
          </ul>
          <p className="fine">
            {t("finePrefix")}{isLive ? t("fineLive") : t("fineMock")}. {t("fineSuffix")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
