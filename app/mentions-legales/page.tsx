import type { Metadata } from 'next';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';

export const metadata: Metadata = {
  title: 'Mentions làgales · Domipack',
  description: 'Mentions làgales du site Domipack.',
};

export default function MentionsLegalesPage() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <div className="domipack-wrap">
          <header className="legal-head">
            <span className="eyebrow">Informations làgales</span>
            <h1>Mentions làgales</h1>
            <p className="legal-updated">Dernière mise · jour : juillet 2026</p>
          </header>

          <section className="legal-block">
            <h2>1. éditeur du site</h2>
            <p>
              Le présent site est édité par <strong>Domipack</strong>, marque
              fictive utilisée dans le cadre d&apos;une maquette de démonstration.
              Les informations présentées ici sont fournies · titre indicatif et
              ne correspondent pas à une activité commerciale réelle.
            </p>
          </section>

          <section className="legal-block">
            <h2>2. Responsable de la publication</h2>
            <p>
              Le responsable de la publication est l&apos;administrateur du site
              de démonstration.
            </p>
          </section>

          <section className="legal-block">
            <h2>3. Hébergement</h2>
            <p>
              Le site est hébergé par un prestataire d&apos;hébergement web. Les
              coordonnées exactes de l&apos;hébergeur seront communiquées · l&apos;activation de la version de production.
            </p>
          </section>

          <section className="legal-block">
            <h2>4. Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble des contenus présents sur ce site (textes, images,
              logos, éléments graphiques) est protégé par le droit de la propriété
              intellectuelle. Toute reproduction, représentation, modification ou
              diffusion, totale ou partielle, est interdite sans autorisation
              préalable.
            </p>
          </section>

          <section className="legal-block">
            <h2>5. Responsabilité</h2>
            <p>
              Ce site étant une maquette de démonstration, les informations
              diffusées (offres d&apos;emploi, tarifs, témoignages) sont fictives.
              L&apos;éditeur ne saurait être tenu responsable d&apos;une décision
              prise sur la base de ces contenus.
            </p>
          </section>

          <section className="legal-block">
            <h2>6. Liens hypertextes</h2>
            <p>
              Le site peut contenir des liens vers d&apos;autres sites. L&apos;éditeur
              n&apos;exerce aucun contrôle sur ces sites et décline toute
              responsabilité quant · leur contenu.
            </p>
          </section>

          <section className="legal-block">
            <h2>7. Droit applicable</h2>
            <p>
              Les présentes mentions làgales sont régies par le droit français.
              En cas de litige, les tribunaux français seront seuls compétents.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
