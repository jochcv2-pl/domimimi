import Reveal from "@/components/ui/Reveal";

export default function Benefits() {
  return (
    <section className="domipack-pad" id="avantages">
      <div className="domipack-wrap">
        <Reveal as="div" className="section-head">
          <span className="eyebrow">Pourquoi Domipack</span>
          <h2>Un vrai travail, chez soi, sans mauvaise surprise.</h2>
          <p>On sait que ce type d&apos;annonce inspire souvent la méfiance. C&apos;est justement pour ça qu&apos;on fait les choses dans les règles, de A à Z.</p>
        </Reveal>
        <div className="cards">
          <Reveal className="card">
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 6v6l4 2" stroke="#1E3A2F" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" stroke="#1E3A2F" strokeWidth="2" />
              </svg>
            </div>
            <h3>Tes horaires</h3>
            <p>Tu emballes quand tu veux dans la semaine, du moment que les colis sont prêts à la date de collecte.</p>
          </Reveal>
          <Reveal className="card">
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="9" width="16" height="11" rx="2" stroke="#1E3A2F" strokeWidth="2" />
                <path d="M8 9V7a4 4 0 018 0v2" stroke="#1E3A2F" strokeWidth="2" />
              </svg>
            </div>
            <h3>Zéro avance</h3>
            <p>Tu ne paies rien, à aucun moment. Cartons, ruban et étiquettes sont livrés chez toi gratuitement.</p>
          </Reveal>
          <Reveal className="card">
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 12h16M4 12l4-4M4 12l4 4" stroke="#1E3A2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Payé, régulier</h3>
            <p>Salaire versé chaque mois avec bulletin de paie, comme n&apos;importe quel emploi déclaré.</p>
          </Reveal>
          <Reveal className="card">
            <div className="ico">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" stroke="#1E3A2F" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Sans expérience</h3>
            <p>On te forme en une courte vidéo. Si tu sais plier un carton et suivre une consigne, c&apos;est parfait.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
