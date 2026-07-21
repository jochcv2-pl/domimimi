import Reveal from "@/components/ui/Reveal";

export default function Steps() {
  return (
    <section className="domipack-pad bg-sage" id="etapes">
      <div className="domipack-wrap">
        <Reveal className="section-head">
          <span className="eyebrow">Le parcours d&apos;un colis</span>
          <h2>Quatre étapes, et c&apos;est réglé.</h2>
          <p>
            Du matériel livré chez toi jusqu&apos;au versement du salaire, voici
            exactement comment se déroule une mission.
          </p>
        </Reveal>
        <div className="steps">
          <Reveal className="step">
            <div className="no">1</div>
            <h3>Tu reçois le kit</h3>
            <p>
              Un transporteur dépose cartons, calage et étiquettes · ton
              domicile, avec la fiche de consignes.
            </p>
          </Reveal>
          <Reveal className="step">
            <div className="no">2</div>
            <h3>Tu emballes</h3>
            <p>
              Tu prépares les colis selon le modèle fourni, sur ta table, au
              moment qui t&apos;arrange.
            </p>
          </Reveal>
          <Reveal className="step">
            <div className="no">3</div>
            <h3>On collecte</h3>
            <p>
              Le transporteur repasse récupérer les colis prêts. Aucun
              déplacement de ta part.
            </p>
          </Reveal>
          <Reveal className="step">
            <div className="no">4</div>
            <h3>Tu es payé</h3>
            <p>
              Après contrôle, ta rémunération part sur le bulletin du mois.
              Simple et traçable.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
