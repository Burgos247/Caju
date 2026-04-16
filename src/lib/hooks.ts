import { useEffect, useCallback } from "react"
import { useGameStore, selectLeaderboard, selectCurrentQuestion, selectAnswerCount } from "@/store/gameStore"
import { connectNDK, getOrCreateSigner } from "@/lib/nostr"
import {
  publishSession,
  publishQuestion,
  publishAnswer,
  updateSessionStatus,
} from "@/lib/events"
import { SessionStatus, QuestionContent } from "@/types/nostr"

// ─── useNostrIdentity ─────────────────────────────────────────────────────────
// Conecta NDK y establece la identidad del usuario (NIP-07 o efímera).
// Llamar una vez en el layout raíz o en cada page.

export function useNostrIdentity() {
  const setMyPubkey = useGameStore((s) => s.setMyPubkey)
  const myPubkey = useGameStore((s) => s.myPubkey)
  const setError = useGameStore((s) => s.setError)

  useEffect(() => {
    if (myPubkey) return // ya identificado

    async function init() {
      try {
        await connectNDK()
        const signer = await getOrCreateSigner()
        const user = await signer.user()
        setMyPubkey(user.pubkey)
      } catch (err) {
        setError(`No se pudo conectar: ${err}`)
      }
    }
    init()
  }, [myPubkey, setMyPubkey, setError])

  return myPubkey
}

// ─── useHostSession ───────────────────────────────────────────────────────────
// Para la página /host. Crea y gestiona la sesión como host.

export function useHostSession() {
  const store = useGameStore()
  const myPubkey = useNostrIdentity()

  const createSession = useCallback(
    async (opts: { title: string; description?: string; question_count: number }) => {
      try {
        store.setIsHost(true)
        const ndk = await connectNDK()
        const { sessionId } = await publishSession(ndk, opts)
        store.setSessionId(sessionId)
        store.setPhase("lobby")
        await store.subscribeToSession(sessionId)
        return sessionId
      } catch (err) {
        store.setError(`Error al crear sesión: ${err}`)
        return null
      }
    },
    [store]
  )

  const pushQuestion = useCallback(
    async (index: number, question: QuestionContent) => {
      const { sessionId, session } = store
      if (!sessionId || !session) return

      try {
        const ndk = await connectNDK()
        await publishQuestion(ndk, sessionId, index, question)
        store.setCurrentQuestionIndex(index)
        store.setPhase("question")
      } catch (err) {
        store.setError(`Error al publicar pregunta: ${err}`)
      }
    },
    [store]
  )

  const finishSession = useCallback(async () => {
    const { sessionId, session } = store
    if (!sessionId || !session) return

    try {
      const ndk = await connectNDK()
      const content = {
        title: session.title,
        description: session.description,
        question_count: session.question_count,
        created_at: session.created_at,
      }
      await updateSessionStatus(ndk, sessionId, "finished" as SessionStatus, content)
      store.setPhase("results")
    } catch (err) {
      store.setError(`Error al finalizar sesión: ${err}`)
    }
  }, [store])

  return {
    myPubkey,
    sessionId: store.sessionId,
    session: store.session,
    phase: store.phase,
    currentQuestionIndex: store.currentQuestionIndex,
    players: store.players,
    error: store.error,
    createSession,
    pushQuestion,
    finishSession,
  }
}

// ─── usePlayerSession ─────────────────────────────────────────────────────────
// Para las páginas /join y /play. El jugador se une y responde.

export function usePlayerSession(sessionId: string) {
  const store = useGameStore()
  const myPubkey = useNostrIdentity()

  // Suscribirse cuando llega sessionId
  useEffect(() => {
    if (!sessionId) return
    store.subscribeToSession(sessionId)
    store.setIsHost(false)

    return () => store.cleanup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const submitAnswer = useCallback(
    async (selected_index: number) => {
      const { sessionId: sid, currentQuestionIndex, hasAnswered } = store
      if (!sid || hasAnswered || currentQuestionIndex < 0) return

      try {
        const ndk = await connectNDK()
        await publishAnswer(ndk, sid, currentQuestionIndex, selected_index)
        store.setMyAnswer(currentQuestionIndex, selected_index)
        store.setHasAnswered(true)
      } catch (err) {
        store.setError(`Error al enviar respuesta: ${err}`)
      }
    },
    [store]
  )

  return {
    myPubkey,
    session: store.session,
    phase: store.phase,
    currentQuestion: selectCurrentQuestion(store),
    hasAnswered: store.hasAnswered,
    myAnswers: store.myAnswers,
    leaderboard: selectLeaderboard(store),
    answerCount: selectAnswerCount(store),
    error: store.error,
    submitAnswer,
  }
}

// ─── useLeaderboard ───────────────────────────────────────────────────────────
// Selector derivado, usable en host y player views.

export function useLeaderboard() {
  return useGameStore(selectLeaderboard)
}
