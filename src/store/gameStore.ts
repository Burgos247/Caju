import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { NDKEvent, NDKSubscription } from "@nostr-dev-kit/ndk"
import { KIND, Session, Question, Player, SessionStatus } from "@/types/nostr"
import { parseSession, parseQuestion, calculatePoints, answerFilter } from "@/lib/events"
import { connectNDK } from "@/lib/nostr"

// ─── State shape ──────────────────────────────────────────────────────────────

interface GameState {
  // Identidad
  myPubkey: string | null

  // Sesión actual
  session: Session | null
  sessionId: string | null

  // Preguntas (indexadas por su índice numérico)
  questions: Record<number, Question>

  // Jugadores (indexados por pubkey)
  players: Record<string, Player>

  // Estado de la partida (host view)
  currentQuestionIndex: number
  isHost: boolean

  // Estado del jugador
  myAnswers: Record<number, number>   // índice pregunta → opción elegida
  hasAnswered: boolean                // en la pregunta actual

  // Subscripciones activas (para cleanup)
  _subs: NDKSubscription[]

  // UI flags
  phase: "idle" | "lobby" | "question" | "results"
  error: string | null
}

// ─── Actions shape ────────────────────────────────────────────────────────────

interface GameActions {
  // Setup
  setMyPubkey: (pubkey: string) => void
  setIsHost: (v: boolean) => void

  // Sesión
  setSession: (session: Session) => void
  setSessionId: (id: string) => void
  updateSessionStatus: (status: SessionStatus) => void

  // Preguntas
  addQuestion: (q: Question) => void
  setCurrentQuestionIndex: (i: number) => void

  // Jugadores
  upsertPlayer: (pubkey: string, partial: Partial<Player>) => void
  recordAnswer: (opts: {
    pubkey: string
    questionIndex: number
    selected_index: number
    answered_at: number
    question_published_at: number
    duration: number
    correct_index: number
  }) => void

  // Mi respuesta
  setMyAnswer: (questionIndex: number, selected: number) => void
  setHasAnswered: (v: boolean) => void

  // Phase
  setPhase: (phase: GameState["phase"]) => void

  // Subscripciones
  subscribeToSession: (sessionId: string) => Promise<void>
  cleanup: () => void

  // Error
  setError: (msg: string | null) => void

  // Reset completo
  reset: () => void
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: GameState = {
  myPubkey: null,
  session: null,
  sessionId: null,
  questions: {},
  players: {},
  currentQuestionIndex: -1,
  isHost: false,
  myAnswers: {},
  hasAnswered: false,
  _subs: [],
  phase: "idle",
  error: null,
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState & GameActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ── Setup ──

      setMyPubkey: (pubkey) => set({ myPubkey: pubkey }),
      setIsHost: (v) => set({ isHost: v }),

      // ── Sesión ──

      setSession: (session) => set({ session }),
      setSessionId: (id) => set({ sessionId: id }),
      updateSessionStatus: (status) =>
        set((s) => ({
          session: s.session ? { ...s.session, status } : null,
        })),

      // ── Preguntas ──

      addQuestion: (q) =>
        set((s) => ({ questions: { ...s.questions, [q.index]: q } })),

      setCurrentQuestionIndex: (i) =>
        set({ currentQuestionIndex: i, hasAnswered: false }),

      // ── Jugadores ──

      upsertPlayer: (pubkey, partial) =>
        set((s) => {
          const existing = s.players[pubkey] ?? {
            pubkey,
            score: 0,
            answers: {},
          }
          return {
            players: {
              ...s.players,
              [pubkey]: { ...existing, ...partial },
            },
          }
        }),

      recordAnswer: ({ pubkey, questionIndex, selected_index, answered_at, question_published_at, duration, correct_index }) => {
        const correct = selected_index === correct_index
        const points = calculatePoints({
          correct,
          answered_at,
          question_published_at,
          duration,
        })

        set((s) => {
          const existing = s.players[pubkey] ?? {
            pubkey,
            score: 0,
            answers: {},
          }

          // Ignorar respuestas duplicadas para la misma pregunta
          if (existing.answers[questionIndex]) return s

          return {
            players: {
              ...s.players,
              [pubkey]: {
                ...existing,
                score: existing.score + points,
                answers: {
                  ...existing.answers,
                  [questionIndex]: { selected_index, answered_at, correct, points },
                },
              },
            },
          }
        })
      },

      // ── Mi respuesta ──

      setMyAnswer: (questionIndex, selected) =>
        set((s) => ({
          myAnswers: { ...s.myAnswers, [questionIndex]: selected },
        })),

      setHasAnswered: (v) => set({ hasAnswered: v }),

      // ── Phase ──

      setPhase: (phase) => set({ phase }),

      // ── Subscripciones ───────────────────────────────────────────────────────
      // Una sola llamada suscribe a los tres kinds relevantes para la sesión.
      // Los eventos son procesados aquí y el store se actualiza en consecuencia.

      subscribeToSession: async (sessionId) => {
        const ndk = await connectNDK()
        const store = get()

        // Limpiar subs previas si las hay
        store._subs.forEach((s) => s.stop())

        // — Sesión (status updates del host) —
        const sessionSub = ndk.subscribe(
          { kinds: [KIND.SESSION], "#d": [sessionId] },
          { closeOnEose: false }
        )
        sessionSub.on("event", (event: NDKEvent) => {
          const parsed = parseSession(event)
          if (!parsed) return
          const { setSession, setPhase } = get()
          setSession(parsed)

          if (parsed.status === "lobby") setPhase("lobby")
          else if (parsed.status === "finished") setPhase("results")
        })

        // — Preguntas (host publica cuando activa cada una) —
        const questionSub = ndk.subscribe(
          { kinds: [KIND.QUESTION], "#e": [sessionId] },
          { closeOnEose: false }
        )
        questionSub.on("event", (event: NDKEvent) => {
          const parsed = parseQuestion(event)
          if (!parsed) return
          const { addQuestion, setCurrentQuestionIndex, setPhase } = get()
          addQuestion(parsed)
          setCurrentQuestionIndex(parsed.index)
          setPhase("question")
        })

        // — Respuestas (todos los jugadores) —
        const answerSub = ndk.subscribe(
          answerFilter(sessionId),
          { closeOnEose: false }
        )
        answerSub.on("event", (event: NDKEvent) => {
          try {
            const content = JSON.parse(event.content)
            const questionIndex = Number(
              event.tags.find((t) => t[0] === "index")?.[1] ?? -1
            )
            if (questionIndex < 0) return

            const { questions, recordAnswer, upsertPlayer } = get()
            const question = questions[questionIndex]
            if (!question) return

            // Asegurarse de que el jugador existe
            upsertPlayer(event.pubkey, {})

            recordAnswer({
              pubkey: event.pubkey,
              questionIndex,
              selected_index: content.selected_index,
              answered_at: content.answered_at,
              question_published_at: question.published_at,
              duration: question.duration,
              correct_index: question.correct_index,
            })
          } catch {
            // evento malformado, ignorar
          }
        })

        set({ _subs: [sessionSub, questionSub, answerSub], sessionId })
      },

      // ── Cleanup ──

      cleanup: () => {
        get()._subs.forEach((s) => s.stop())
        set({ _subs: [] })
      },

      // ── Error ──

      setError: (msg) => set({ error: msg }),

      // ── Reset ──

      reset: () => {
        get()._subs.forEach((s) => s.stop())
        set(initialState)
      },
    }),
    { name: "caju-game" }
  )
)

// ─── Selectors ────────────────────────────────────────────────────────────────
// Derivados computados para evitar lógica en componentes.

export const selectLeaderboard = (s: GameState) =>
  Object.values(s.players)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }))

export const selectCurrentQuestion = (s: GameState): Question | null =>
  s.currentQuestionIndex >= 0 ? s.questions[s.currentQuestionIndex] ?? null : null

export const selectPlayerCount = (s: GameState) =>
  Object.keys(s.players).length

export const selectAnswerCount = (s: GameState) => {
  const qi = s.currentQuestionIndex
  return Object.values(s.players).filter((p) => p.answers[qi] !== undefined).length
}
