import type { Metadata } from 'next';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';
import { getTranslations } from 'next-intl/server';
import { getBrandSettings } from '@/lib/brand';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('privacy');
  const { brandName } = await getBrandSettings();
  return {
    title: t('meta.title', { brandName }),
    description: t('meta.description', { brandName }),
  };
}

export default async function ConfidentialitePage() {
  const t = await getTranslations('privacy');
  const { brandName, logoUrl } = await getBrandSettings();
  return (
    <>
      <Navbar brandName={brandName} logoUrl={logoUrl} />
      <main className="legal-page">
        <div className="domipack-wrap">
          <header className="legal-head">
            <span className="eyebrow">{t("eyebrow")}</span>
            <h1>{t("title")}</h1>
            <p className="legal-updated">{t("updated")}</p>
          </header>

          <section className="legal-block">
            <p className="legal-intro">
              {t("intro", { brandName })}
            </p>
          </section>

          <section className="legal-block">
            <h2>{t("s1.title")}</h2>
            <p>{t("s1.body1")}</p>
            <p>{t("s1.body2")}</p>
          </section>

          <section className="legal-block">
            <h2>{t("s2.title")}</h2>
            <ul className="legal-list">
              <li>{t("s2.li1")}</li>
              <li>{t("s2.li2")}</li>
              <li>{t("s2.li3")}</li>
            </ul>
          </section>

          <section className="legal-block">
            <h2>{t("s3.title")}</h2>
            <p>{t("s3.body")}</p>
          </section>

          <section className="legal-block">
            <h2>{t("s4.title")}</h2>
            <p>{t("s4.body")}</p>
          </section>

          <section className="legal-block">
            <h2>{t("s5.title")}</h2>
            <p>{t("s5.body", { brandName })}</p>
          </section>

          <section className="legal-block">
            <h2>{t("s6.title")}</h2>
            <p>{t("s6.body")}</p>
            <ul className="legal-list">
              <li>{t("s6.li1")}</li>
              <li>{t("s6.li2")}</li>
              <li>{t("s6.li3")}</li>
              <li>{t("s6.li4")}</li>
              <li>{t("s6.li5")}</li>
            </ul>
            <p>
              {t("s6.contactPrefix")}{' '}
              <Link href="/contact" className="legal-link">
                {t("s6.contactLink")}
              </Link>
              .
            </p>
          </section>

          <section className="legal-block">
            <h2>{t("s7.title")}</h2>
            <p>{t("s7.body")}</p>
          </section>

          <section className="legal-block">
            <h2>{t("s8.title")}</h2>
            <p>{t("s8.body")}</p>
          </section>
        </div>
      </main>
      <Footer brandName={brandName} logoUrl={logoUrl} />
    </>
  );
}
