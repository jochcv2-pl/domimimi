export default function TrustBar() {
  return (
    <div className="trust">
      <div className="domipack-wrap">
        <div className="chip">
          <span className="num">0 €</span>
          <div>
            Frais à l&apos;entrée
            <small>Le matériel est fourni gratuitement</small>
          </div>
        </div>
        <div className="chip">
          <span className="num">CDD/CDI</span>
          <div>
            Contrat déclaré
            <small>Bulletin de paie chaque mois</small>
          </div>
        </div>
        <div className="chip">
          <span className="num">100%</span>
          <div>
            à domicile
            <small>Partout en France métropolitaine</small>
          </div>
        </div>
        <div className="chip">
          <span className="num">48h</span>
          <div>
            Réponse
            <small>On revient vers toi sous 2 jours</small>
          </div>
        </div>
      </div>
    </div>
  );
}
