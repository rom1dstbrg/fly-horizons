import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { SplashScreen } from "@/components/SplashScreen";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Fly Horizons",
    template: "%s | Fly Horizons",
  },
  description: "Boutique officielle Fly Horizons — Accessoires aviation premium.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  icons: {
    icon: "/icone.svg",
    shortcut: "/icone.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full`}>
      <body className="min-h-full antialiased">
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}