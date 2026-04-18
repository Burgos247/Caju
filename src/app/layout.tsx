import type { Metadata, Viewport } from "next"
import { Syne, DM_Mono } from "next/font/google"
import "./globals.css"

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
  variable: "--font-syne",
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
})

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://caju.app"

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: "cajú", template: "%s · cajú" },
  description: "quizzes en tiempo real sobre Nostr — sin backend, sin base de datos, cada respuesta es un evento firmado",
  keywords: ["nostr", "quiz", "lightning", "bitcoin", "trivia", "tiempo real"],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: BASE_URL,
    siteName: "cajú",
    title: "cajú — quizzes en tiempo real sobre Nostr",
    description: "sin backend, sin base de datos, cada respuesta es un evento firmado",
  },
  twitter: {
    card: "summary_large_image",
    title: "cajú — quizzes sobre Nostr",
    description: "sin backend, sin base de datos, cada respuesta es un evento firmado",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0e0e0e",
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={`${syne.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
