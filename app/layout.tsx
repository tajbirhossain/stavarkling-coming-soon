import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const cormorant = localFont({
  src: "./fonts/CormorantGaramond-VariableFont_wght.ttf",
  variable: "--font-cormorant",
  weight: "300 700",
  display: "swap",
});

const cinzel = localFont({
  src: "./fonts/Cinzel-VariableFont_wght.ttf",
  variable: "--font-cinzel",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stavarkling | Coming Soon",
  description:
    "Stavarkling — Luxury Visionary Art. Something extraordinary is coming soon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full font-serif text-text bg-cream">{children}</body>
    </html>
  );
}
