import type { Metadata } from "next"
import { Inter, Playfair_Display, Tiro_Devanagari_Hindi } from "next/font/google"
import { cookies } from "next/headers"
import "./globals.css"
import AppProviders from "@/components/providers/AppProviders"
import { getLangFromCookies } from "@/lib/i18n/server"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["600", "700", "800"],
  display: "swap",
})
const tiroHindi = Tiro_Devanagari_Hindi({
  weight: "400",
  subsets: ["devanagari", "latin"],
  variable: "--font-hindi",
  display: "swap",
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kmrgp.vercel.app"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kshatriya Mewada Rajput Parivar",
    template: "%s · Kshatriya Mewada Rajput Parivar",
  },
  description:
    "Preserving heritage, uniting families through verified matrimonial matches within the Kshatriya Mewada Rajput community.",
  keywords: [
    "Kshatriya",
    "Mewada",
    "Rajput",
    "matrimony",
    "biodata",
    "gotra",
    "community",
    "parivar",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Kshatriya Mewada Rajput Parivar",
    title: "Kshatriya Mewada Rajput Parivar",
    description:
      "Preserving heritage, uniting families through verified matrimonial matches.",
    images: [{ url: "/images/maharana_pratap.png", width: 1200, height: 630, alt: "Kshatriya Mewada Rajput Parivar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kshatriya Mewada Rajput Parivar",
    description:
      "Preserving heritage, uniting families through verified matrimonial matches.",
    images: ["/images/maharana_pratap.png"],
  },
  robots: { index: true, follow: true },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const lang = getLangFromCookies(cookieStore.get?.("lang")?.value ?? null)

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${playfair.variable} ${tiroHindi.variable} ${lang === "hi" ? "lang-hi" : ""}`}
    >
      <body className="font-sans">
        <AppProviders initialLang={lang}>{children}</AppProviders>
      </body>
    </html>
  )
}