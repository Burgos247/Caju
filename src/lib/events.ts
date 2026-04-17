import NDK, { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk"
import { nanoid } from "nanoid"
import {
  KIND,
  SessionContent,
  SessionStatus,
  QuestionContent,
  AnswerContent,
  Question,
  Session,
} from "@/types/nostr"

// ─── Publish helpers (host) ───────────────────────────────────────────────────

export async function publishSession(
  ndk: NDK,
  opts: {
    title: string
    description?: string
    question_count: number
  }
): Promise<{ sessionId: string; event: NDKEvent }> {
  const sessionId = nanoid(10)

  const content: SessionContent = {
    title: opts.title,
    description: opts.description,
    question_count: opts.question_count,
    created_at: Date.now(),
  }

  const event = new NDKEvent(ndk)
  event.kind = KIND.SESSION
  event.content = JSON.stringify(content)
  event.tags = [
    ["d", sessionId],
    ["title", opts.title],
    ["status", "lobby" satisfies SessionStatus],
    ["question_count", String(opts.question_count)],
  ]

  await event.publish()
  return { sessionId, event }
}

export async function updateSessionStatus(
  ndk: NDK,
  sessionId: string,
  status: SessionStatus,
  existingContent: SessionContent
): Promise<NDKEvent> {
  const event = new NDKEvent(ndk)
  event.kind = KIND.SESSION
  event.content = JSON.stringify(existingContent)
  event.tags = [
    ["d", sessionId],
    ["title", existingContent.title],
    ["status", status],
    ["question_count", String(existingContent.question_count)],
  ]

  await event.publish()
  return event
}

export async function publishQuestion(
  ndk: NDK,
  sessionId: string,
  index: number,
  question: QuestionContent
): Promise<NDKEvent> {
  const dTag = `${sessionId}:q${index}`

  const event = new NDKEvent(ndk)
  event.kind = KIND.QUESTION
  event.content = JSON.stringify(question)
  event.tags = [
    ["d", dTag],
    ["e", sessionId],
    ["index", String(index)],
    ["duration", String(question.duration)],
  ]

  await event.publish()
  return event
}

export async function publishAnswer(
  ndk: NDK,
  sessionId: string,
  questionIndex: number,
  selected_index: number
): Promise<NDKEvent> {
  const answer: AnswerContent = {
    selected_index,
    answered_at: Date.now(),
  }

  const event = new NDKEvent(ndk)
  event.kind = KIND.ANSWER
  event.content = JSON.stringify(answer)
  event.tags = [
    ["e", sessionId],
    ["q", `${sessionId}:q${questionIndex}`],
    ["index", String(questionIndex)],
  ]

  await event.publish()
  return event
}

// ─── Subscribe helpers ────────────────────────────────────────────────────────

export function sessionFilter(sessionId: string): NDKFilter {
  return {
    kinds: [KIND.SESSION],
    "#d": [sessionId],
  }
}

export function questionFilter(sessionId: string): NDKFilter {
  return {
    kinds: [KIND.QUESTION],
    "#e": [sessionId],
  }
}

export function answerFilter(sessionId: string): NDKFilter {
  return {
    kinds: [KIND.ANSWER],
    "#e": [sessionId],
  }
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

export function parseSession(event: NDKEvent): Session | null {
  try {
    const content: SessionContent = JSON.parse(event.content)
    const sessionId = event.tags.find((t) => t[0] === "d")?.[1]
    const status = (event.tags.find((t) => t[0] === "status")?.[1] ?? "lobby") as SessionStatus

    if (!sessionId) return null

    return {
      id: sessionId,
      title: content.title,
      description: content.description,
      host_pubkey: event.pubkey,
      status,
      question_count: content.question_count,
      created_at: content.created_at,
    }
  } catch {
    return null
  }
}

export function parseQuestion(event: NDKEvent): Question | null {
  try {
    const content: QuestionContent = JSON.parse(event.content)
    const dTag = event.tags.find((t) => t[0] === "d")?.[1]
    const index = Number(event.tags.find((t) => t[0] === "index")?.[1] ?? -1)

    // Sin timestamp del relay no podemos calcular scoring — descartar.
    if (!dTag || index < 0 || !event.created_at) return null

    return {
      id: dTag,
      index,
      text: content.text,
      options: content.options,
      correct_index: content.correct_index,
      duration: content.duration,
      published_at: event.created_at * 1000,
    }
  } catch {
    return null
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
// Puntos = base si correcto, escalado por velocidad de respuesta.
// answered_at es timestamp del cliente — no perfecto pero suficiente para MVP.

const BASE_POINTS = 1000
const SPEED_BONUS = 500 // puntos extra máximos por velocidad

export function calculatePoints(opts: {
  correct: boolean
  answered_at: number       // ms, timestamp absoluto
  question_published_at: number // ms
  duration: number          // segundos
}): number {
  if (!opts.correct) return 0

  const elapsed = opts.answered_at - opts.question_published_at
  const window = opts.duration * 1000
  // Clamp a [0, 1] — el reloj del cliente puede estar adelantado al del relay
  // (elapsed negativo) o atrasado (elapsed > window); ambos casos darían
  // puntajes fuera de rango sin clamping.
  const ratio = Math.min(1, Math.max(0, 1 - elapsed / window))

  return Math.round(BASE_POINTS + SPEED_BONUS * ratio)
}
