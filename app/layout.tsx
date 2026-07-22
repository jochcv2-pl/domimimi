import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import Providers from "@/components/providers/Providers";
import "./globals.css";

// Root layout — définit <html> et <body> pour TOUTES les routes
// (publiques ET admin/login). Les polices sont chargées ici pour
// être disponibles partout.
// Le <html lang> par défaut est "de" (langue principale).
// Pour les pages /fr/, le lang est mis à jour client-side.
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const instrument = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${bricolage.variable} ${instrument.variable} antialiased`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
