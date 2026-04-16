// Cajú — Nostr event kinds
// Arbitrarios por ahora; candidatos a NIP cuando estabilicemos el protocolo

export const KIND = {
  SESSION:  30000,
  QUESTION: 30001,
  ANSWER:   30002,
} as const

// ─── Session (kind 30000) ─────────────────────────────────────────────────────
// Publicado por el host al crear el quiz.
// d-tag = sessionId (nanoid)
//
// content: JSON.stringify(SessionContent)
// tags:
//   ["d", sessionId]
//   ["title", "nombre del quiz"]
//   ["status", "lobby" | "finished"]
//   ["question_count", "N"]

export interface SessionContent {
  title: string
  description?: string
  question_count: number
  created_at: number
}

export type SessionStatus = "lobby" | "finished"

// ─── Question (kind 30001) ────────────────────────────────────────────────────
// Publicado por el host UNA vez por pregunta cuando la activa.
// d-tag = `${sessionId}:q${index}`
//
// content: JSON.stringify(QuestionContent)
// tags:
//   ["d", `${sessionId}:q${index}`]
//   ["e", sessionId]           ← referencia a la sesión
//   ["index", "0"]             ← orden de la pregunta
//   ["duration", "20"]         ← segundos disponibles

export interface QuestionContent {
  text: string
  options: string[]           // exactamente 4
  correct_index: number       // 0-3
  duration: number            // segundos
}

// ─── Answer (kind 30002) ─────────────────────────────────────────────────────
// Publicado por cada jugador al responder.
// No tiene d-tag (replaceable no aplica, cada respuesta es única)
//
// content: JSON.stringify(AnswerContent)
// tags:
//   ["e", sessionId]          ← sesión
//   ["q", `${sessionId}:q${index}`]  ← pregunta específica
//   ["index", "0"]            ← índice de la pregunta

export interface AnswerContent {
  selected_index: number      // opción elegida
  answered_at: number         // Date.now() del cliente — usado para scoring
}

// ─── Derived types (UI) ──────────────────────────────────────────────────────

export interface Question {
  id: string                  // d-tag
  index: number
  text: string
  options: string[]
  correct_index: number
  duration: number
  published_at: number        // timestamp del evento Nostr
}

export interface Player {
  pubkey: string
  name?: string               // NIP-01 display_name si está disponible
  score: number
  answers: Record<number, {   // por índice de pregunta
    selected_index: number
    answered_at: number
    correct: boolean
    points: number
  }>
}

export interface Session {
  id: string
  title: string
  description?: string
  host_pubkey: string
  status: SessionStatus
  question_count: number
  created_at: number
}
