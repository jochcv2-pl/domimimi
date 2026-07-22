import type { Metadata } from 'next';
import Navbar from '@/components/sections/Navbar';
import Footer from '@/components/sections/Footer';
import { getTranslations } from 'next-intl/server';
import { getBrandSettings } from '@/lib/brand';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal');
  const { brandName } = await getBrandSettings();
  return {
    title: t('meta.title', { brandName }),
    description: t('meta.description', { brandName }),
  };
}

export default async function MentionsLegalesPage() {
  const t = await getTranslations('legal');
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
            <h2>{t("s1.title")}</h2>
            <p>{t("s1.body", { brandName })}</p>
          </section>

          <section className="legal-block">
            <h2>{t("s2.title")}</h2>
            <p>{t("s2.body")}</p>
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
            <p>{t("s5.body")}</p>
          </section>

          <section className="legal-block">
            <h2>{t("s6.title")}</h2>
            <p>{t("s6.body")}</p>
          </section>

          <section className="legal-block">
            <h2>{t("s7.title")}</h2>
            <p>{t("s7.body")}</p>
          </section>
        </div>
      </main>
      <Footer brandName={brandName} logoUrl={logoUrl} />
    </>
  );
}
