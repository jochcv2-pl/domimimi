import Reveal from "@/components/ui/Reveal";

export default function Testimonials() {
  return (
    <section className="domipack-pad bg-sage">
      <div className="domipack-wrap">
        <Reveal className="section-head" as="div">
          <span className="eyebrow">Ils emballent avec nous</span>
          <h2>Des profils très différents, une même libert….</h2>
        </Reveal>
        <div className="quotes">
          <Reveal className="quote">
            <div className="stars">★★★★★</div>
            <p>« Je m&apos;organise autour de mes enfants. Le matin, ils sont à l&apos;école, je prépare mes colis, et le reste de la journée m&apos;appartient. »</p>
            <div className="who"><div className="avatar">SL</div><div><b>Sophie L.</b><small>Parent au foyer · Nantes*</small></div></div>
          </Reveal>
          <Reveal className="quote">
            <div className="stars">★★★★★</div>
            <p>« Ce qui m&apos;a rassuré, c&apos;est qu&apos;on ne m&apos;a jamais demandé un centime. J&apos;ai signé un vrai contrat, reçu le matériel, et j&apos;ai été payé le mois suivant. »</p>
            <div className="who"><div className="avatar">KM</div><div><b>Karim M.</b><small>En reconversion · Lyon*</small></div></div>
          </Reveal>
          <Reveal className="quote">
            <div className="stars">★★★★★</div>
            <p>« À la retraite, ça me fait un complément et ça m&apos;occupe les mains. Le geste est simple, la collecte se fait chez moi. Rien à redire. »</p>
            <div className="who"><div className="avatar">DF</div><div><b>Danielle F.</b><small>Retraitée · Toulouse*</small></div></div>
          </Reveal>
        </div>
        <p style={{ textAlign: "center", marginTop: "26px", fontSize: ".82rem", color: "var(--pine-soft)" }}>*Témoignages fictifs — contenu de démonstration pour la maquette.</p>
      </div>
    </section>
  );
}
