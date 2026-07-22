import type { Metadata } from 'next';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';
import ContactForm from '@/components/sections/ContactForm';
import { getTranslations } from 'next-intl/server';
import { getBrandSettings } from '@/lib/brand';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('contact');
  const { brandName } = await getBrandSettings();
  return {
    title: t('meta.title', { brandName }),
    description: t('meta.description', { brandName }),
  };
}

export default async function ContactPage() {
  const t = await getTranslations('contact');
  const { brandName, logoUrl } = await getBrandSettings();
  return (
    <>
      <Navbar brandName={brandName} logoUrl={logoUrl} />
      <main className="legal-page">
        <div className="domipack-wrap">
          <header className="legal-head">
            <span className="eyebrow">{t("eyebrow")}</span>
            <h1>{t("title")}</h1>
            <p className="legal-intro">{t("intro")}</p>
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
                  <h3>{t("item1.title")}</h3>
                  <p>{t("item1.value")}</p>
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
                  <h3>{t("item2.title")}</h3>
                  <p>{t("item2.value")}</p>
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
                  <h3>{t("item3.title")}</h3>
                  <p>{t("item3.value")}</p>
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
                  <h3>{t("item4.title")}</h3>
                  <p>{t("item4.value")}</p>
                </div>
              </div>
            </div>

            <div className="contact-form-wrap">
              <ContactForm />
            </div>
          </div>
        </div>
      </main>
      <Footer brandName={brandName} logoUrl={logoUrl} />
    </>
  );
}
