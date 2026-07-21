import type { Metadata } from 'next';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';
import ContactForm from '@/components/sections/ContactForm';

export const metadata: Metadata = {
  title: 'Nous contacter · Domipack',
  description: 'Contactez l\'équipe Domipack pour toute question sur le recrutement.',
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <div className="domipack-wrap">
          <header className="legal-head">
            <span className="eyebrow">On est là</span>
            <h1>Nous contacter</h1>
            <p className="legal-intro">
              Une question sur le recrutement, les missions ou le fonctionnement ?
              écrivez-nous, on répond sous 48 h.
            </p>
          </header>

          <div className="contact-layout">
            <div className="contact-info">
              <div className="contact-item">
                <div className="contact-ico">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16v12H4z"
                      stroke="#1E3A2F"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 7l8 6 8-6"
                      stroke="#1E3A2F"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3>E-mail</h3>
                  <p>contact@domipack.fr</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-ico">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"
                      stroke="#1E3A2F"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h3>Téléphone</h3>
                  <p>Disponible sur demande</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-ico">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 22s8-7 8-13a8 8 0 10-16 0c0 6 8 13 8 13z"
                      stroke="#1E3A2F"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="9" r="3" stroke="#1E3A2F" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <h3>Zone d&apos;intervention</h3>
                  <p>France métropolitaine</p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-ico">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#1E3A2F" strokeWidth="2" />
                    <path d="M12 7v5l3 2" stroke="#1E3A2F" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h3>Délai de réponse</h3>
                  <p>Sous 48 heures ouvrées</p>
                </div>
              </div>
            </div>

            <div className="contact-form-wrap">
              <ContactForm />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
