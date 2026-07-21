import type { Metadata } from 'next';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Domipack',
  description:
    'Politique de confidentialité et de protection des données personnelles Domipack (RGPD).',
};

export default function ConfidentialitePage() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <div className="domipack-wrap">
          <header className="legal-head">
            <span className="eyebrow">Protection des données</span>
            <h1>Politique de confidentialité</h1>
            <p className="legal-updated">Dernière mise · jour : juillet 2026</p>
          </header>

          <section className="legal-block">
            <p className="legal-intro">
              Domipack s&apos;engage à protéger vos données personnelles conformément
              au Règlement Général sur la Protection des Données (RGPD) et à la
              loi Informatique et Libertés.
            </p>
          </section>

          <section className="legal-block">
            <h2>1. Données collectées</h2>
            <p>
              Dans le cadre d&apos;une candidature, nous collectons les données
              suivantes : prénom, nom, adresse e-mail, numéro de téléphone et code
              postal.
            </p>
            <p>
              Via le formulaire de contact : nom, e-mail et le contenu de votre
              message.
            </p>
          </section>

          <section className="legal-block">
            <h2>2. Finalités du traitement</h2>
            <ul className="legal-list">
              <li>
                Examiner et répondre · votre candidature pour un poste
                d&apos;emballeur à domicile.
              </li>
              <li>
                Vous recontacter dans le cadre du processus de recrutement.
              </li>
              <li>Répondre · vos demandes d&apos;information via le formulaire de contact.</li>
            </ul>
          </section>

          <section className="legal-block">
            <h2>3. Base làgale</h2>
            <p>
              Le traitement de vos données repose sur votre consentement (article
              6.1.a du RGPD) et sur l&apos;exécution de démarches précontractuelles · votre demande (article 6.1.b).
            </p>
          </section>

          <section className="legal-block">
            <h2>4. Durée de conservation</h2>
            <p>
              Vos données sont conservées pour une durée maximale de 2 ans après
              votre dernier échange, sauf demande de suppression de votre part.
            </p>
          </section>

          <section className="legal-block">
            <h2>5. Destinataires</h2>
            <p>
              Vos données sont destinées exclusivement · l&apos;équipe de recrutement
              de Domipack. Elles ne sont jamais vendues ni cédées · des tiers · des
              fins commerciales.
            </p>
          </section>

          <section className="legal-block">
            <h2>6. Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez des droits suivants sur vos
              données :
            </p>
            <ul className="legal-list">
              <li>Droit d&apos;accès · vos données personnelles.</li>
              <li>Droit de rectification des données inexactes.</li>
              <li>Droit à l&apos;effacement (« droit à l&apos;oubli »).</li>
              <li>
                Droit à la limitation ou · l&apos;opposition au traitement.
              </li>
              <li>
                Droit à la portabilité de vos données.
              </li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous via la page{' '}
              <a href="/contact" className="legal-link">
                Nous contacter
              </a>
              .
            </p>
          </section>

          <section className="legal-block">
            <h2>7. Cookies</h2>
            <p>
              Ce site de démonstration n&apos;utilise pas de cookies de suivi
              publicitaire. Seuls les cookies strictement nécessaires au
              fonctionnement technique du site peuvent être utilisés.
            </p>
          </section>

          <section className="legal-block">
            <h2>8. Réclamation</h2>
            <p>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez
              introduire une réclamation auprès de la CNIL
              (www.cnil.fr).
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
