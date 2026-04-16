import type { Metadata } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://caju.app"

// ── /join/[id] ────────────────────────────────────────────────────────────────
// El título del quiz viene del evento Nostr — como no podemos fetchearlo
// en generateMetadata sin un relay server-side, usamos un fallback genérico.
// En v2 podemos agregar un relay SSR o un endpoint API que resuelva el título.

export function joinMetadata(sessionId: string): Metadata {
  return {
    title: "unite al quiz",
    description: `Entrá al quiz en cajú — sesión ${sessionId}`,
    openGraph: {
      title: "te invitaron a un quiz en cajú",
      description: "quizzes en tiempo real sobre Nostr — sin backend, cada respuesta es un evento firmado",
      url: `${BASE_URL}/join/${sessionId}`,
    },
    twitter: {
      card: "summary_large_image",
      title: "te invitaron a un quiz en cajú",
      description: "quizzes en tiempo real sobre Nostr",
    },
  }
}

export function playMetadata(sessionId: string): Metadata {
  return {
    title: "jugando",
    description: `Jugando en cajú — sesión ${sessionId}`,
    robots: { index: false, follow: false },
  }
}

export function resultsMetadata(sessionId: string): Metadata {
  return {
    title: "resultados",
    description: `Resultados del quiz en cajú — sesión ${sessionId}`,
    openGraph: {
      title: "resultados del quiz · cajú",
      description: "verificables on-relay · Nostr",
      url: `${BASE_URL}/results/${sessionId}`,
    },
  }
}
