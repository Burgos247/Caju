import type { Metadata, Viewport } from "next"
import "./globals.css"

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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
