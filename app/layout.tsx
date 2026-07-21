import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import RevealObserver from "@/components/ui/RevealObserver";
import Providers from "@/components/providers/Providers";
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

export const metadata: Metadata = {
  title: "Domipack — L'emballage à domicile, en confiance",
  description:
    "Domipack recrute des personnes soigneuses pour préparer et conditionner des colis, tranquillement, depuis leur table de cuisine.",
};

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
      </body>
    </html>
  );
}
