// Root layout — minimal, just passes children through.
// The <html> and <body> tags live in app/[locale]/layout.tsx
// because the locale is only known once the URL is parsed.
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
