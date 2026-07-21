import Reveal from "@/components/ui/Reveal";

export default function Faq() {
  return (
    <section className="domipack-pad" id="faq">
      <div className="domipack-wrap">
        <Reveal
          as="div"
          className="section-head"
          style={{ margin: "0 auto 48px", textAlign: "center" }}
        >
          <span className="eyebrow" style={{ justifyContent: "center" }}>
            Questions fréquentes
          </span>
          <h2>On répond franchement.</h2>
        </Reveal>
        <div className="faq">
          <details open className="reveal">
            <summary>
              Y a-t-il des frais pour commencer ?
              <span className="faq-flag">Important</span>
              <span className="plus">+</span>
            </summary>
            <p>
              Non, jamais. Aucun frais d&apos;inscription, aucune caution, aucun achat
              de kit. Toute annonce d&apos;emballage à domicile qui vous réclame de
              l&apos;argent pour d · marrer est · fuir. Chez Domipack, le matériel vous
              est livré gratuitement.
            </p>
          </details>
          <details className="reveal">
            <summary>
              Quel type de contrat propose-t-on ?
              <span className="plus">+</span>
            </summary>
            <p>
              Un contrat de travail déclaré, en CDD ou en CDI selon la mission et
              votre disponibilité. Vous recevez un bulletin de paie chaque mois
              et bénéficiez des cotisations sociales habituelles.
            </p>
          </details>
          <details className="reveal">
            <summary>
              Comment et quand suis-je payée ?
              <span className="plus">+</span>
            </summary>
            <p>
              Le salaire est versé mensuellement par virement, après contrôle des
              colis préparés. La rémunération peut être à l&apos;heure ou au colis :
              le mode et le taux sont indiqués noir sur blanc dans votre contrat
              avant toute mission.
            </p>
          </details>
          <details className="reveal">
            <summary>
              Faut-il de l&apos;expérience ou du matériel personnel ?
              <span className="plus">+</span>
            </summary>
            <p>
              Aucune expérience n&apos;est requise : une courte formation vidéo
              suffit. Vous avez seulement besoin d&apos;un espace propre et sec chez
              vous. Cartons, calage, ruban et étiquettes sont fournis.
            </p>
          </details>
          <details className="reveal">
            <summary>
              Comment se passent la livraison et la collecte ?
              <span className="plus">+</span>
            </summary>
            <p>
              Un transporteur dépose le matériel · votre domicile, puis repasse
              récupérer les colis terminés aux dates convenues. Vous n&apos;avez aucun
              déplacement ni frais de transport · votre charge.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
