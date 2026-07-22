import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import RevealObserver from "@/components/ui/RevealObserver";
import { getBrandSettings } from "@/lib/brand";
import { routing } from "@/i18n/routing";
import LangSetter from "@/components/ui/LangSetter";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getBrandSettings();
  const t = await getTranslations("metadata");
  return {
    title: t("title", { brandName }),
    description: t("description", { brandName }),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <LangSetter locale={locale} />
      <RevealObserver />
      {children}
      {/* Umami analytics — self-hosted, privacy-first, pas de cookies */}
      {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
        <script
          async
          defer
          src="/analytics/script.js"
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
        />
      )}
    </NextIntlClientProvider>
  );
}
