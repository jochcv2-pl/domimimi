'use client';

import { useEffect, useState } from "react";
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

  const display = minRate !== null ? `Dès ${formatHourly(minRate)}` : "Dès 12,50";
  const isLive = loaded && minRate !== null;

  return (
    <section className="domipack-pad" id="profil">
      <div className="domipack-wrap split">
        <Reveal>
          <span className="eyebrow">Profil recherché</span>
          <h2
            style={{
              fontSize: "clamp(1.9rem,3.4vw,2.6rem)",
              margin: "14px 0 26px",
            }}
          >
            On cherche du sérieux,
            <br />
            pas un CV parfait.
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
              <div>
                Un petit espace propre et sec chez toi (une table suffit)
              </div>
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
              <div>
                De la rigueur : les colis doivent être soignés et propres
              </div>
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
              <div>
                De la fiabilité pour respecter les dates de collecte
              </div>
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
              <div>Majeure et résidant en France métropolitaine</div>
            </li>
          </ul>
        </Reveal>

        <Reveal className="panel">
          <h3>R · mun · ration</h3>
          <p style={{ color: "#C6D5CC" }}>
            Transparente, définie dans ton contrat.
          </p>
          <div className="price">
            {display} €<small> / heure brut*</small>
          </div>
          <ul>
            <li>Modèle · l&apos;heure ou au colis, selon la mission</li>
            <li>Prime de régularité au trimestre</li>
            <li>Matériel et transport integralement pris en charge</li>
            <li>Bulletin de paie et cotisations comme tout salarié</li>
          </ul>
          <p className="fine">
            *Montant indicatif{isLive ? " — taux live depuis le CRM admin" : " pour cette maquette"}.
            Le taux réel figure au contrat signé avant toute mission.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
