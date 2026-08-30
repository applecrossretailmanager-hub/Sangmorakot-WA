import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://sangmorakotwa.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} | Muay Thai Gym in WA`,
    template: `%s | ${site.shortName}`,
  },
  description:
    "Muay Thai gym in Western Australia. Group classes, memberships, and one-on-one personal training for every level — your first class is free.",
  keywords: ["Muay Thai", "Perth", "Western Australia", "gym", "kickboxing", "personal training", "martial arts"],
  openGraph: {
    title: `${site.name} | Muay Thai Gym in WA`,
    description: site.tagline,
    url: siteUrl,
    siteName: site.name,
    images: [{ url: "/logo.jpg", width: 512, height: 512 }],
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${site.name} | Muay Thai Gym in WA`,
    description: site.tagline,
    images: ["/logo.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
