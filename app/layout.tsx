import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { SplashScreen } from "@/components/SplashScreen";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import "./globals.css";
import { jsonLd } from "@/lib/json-ld";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fly-horizons.com";

export const metadata: Metadata = {
  title: {
    default: "Fly Horizons, vol partagé en Belgique",
    template: "%s · Fly Horizons",
  },
  description:
    "Vols partagés et vols privés en avion léger depuis Charleroi (Belgique). Jusqu'à 3 passagers, itinéraire 100 % libre. Réservez votre expérience unique.",
  metadataBase: new URL(siteUrl),
  keywords: [
    "vol partagé Belgique",
    "vol partagé Charleroi",
    "vol en avion Belgique",
    "vol avion léger Charleroi",
    "vol avion léger Belgique",
    "vol découverte Belgique",
    "cadeau vol avion Belgique",
    "vol panoramique Belgique",
    "Fly Horizons",
  ],
  openGraph: {
    type: "website",
    locale: "fr_BE",
    url: siteUrl,
    siteName: "Fly Horizons",
    title: "Fly Horizons, vol partagé en Belgique",
    description:
      "Vols partagés et vols privés en avion léger depuis Charleroi. Jusqu'à 3 passagers, itinéraire 100 % libre.",
    images: [
      {
        url: "/gallery/10.jpg",
        width: 1200,
        height: 630,
        alt: "Fly Horizons, vol partagé en Belgique",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fly Horizons, vol partagé en Belgique",
    description:
      "Vols privés en avion léger depuis Charleroi. Itinéraire libre, jusqu'à 3 passagers.",
    images: ["/gallery/10.jpg"],
  },
  icons: {
    icon: [
      { url: "/icone.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple:    [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fly Horizons",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fly Horizons",
  url: siteUrl,
  logo: "https://fly-horizons.com/logo-email.png",
  sameAs: ["https://fly-horizons.com"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <AnalyticsTracker />
        <ScrollToTop />
        <SplashScreen />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema) }}
        />
      </body>
    </html>
  );
}