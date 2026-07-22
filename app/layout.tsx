import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import RevealObserver from "@/components/ui/RevealObserver";
import Providers from "@/components/providers/Providers";
import { getBrandSettings } from "@/lib/brand";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const instrument = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getBrandSettings();
  return {
    title: `${brandName} — L'emballage à domicile, en confiance`,
    description: `${brandName} recrute des personnes soigneuses pour préparer et conditionner des colis, tranquillement, depuis leur table de cuisine.`,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${instrument.variable} antialiased`}
    >
      <body>
        <RevealObserver />
        <Providers>{children}</Providers>
        {/* Umami analytics — self-hosted, privacy-first, pas de cookies */}
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            async
            defer
            src="/analytics/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
      </body>
    </html>
  );
}
