import { useEffect, useCallback } from "react"
import { useGameStore, selectLeaderboard, selectCurrentQuestion, selectAnswerCount } from "@/store/gameStore"
import { connectNDK, getOrCreateSigner } from "@/lib/nostr"
import {
  publishSession,
  publishQuestion,
  publishAnswer,
  updateSessionStatus,
} from "@/lib/events"
import { QuestionContent } from "@/types/nostr"

// ─── useNostrIdentity ─────────────────────────────────────────────────────────
// Conecta NDK y establece la identidad del usuario (NIP-07 o efímera).
// Llamar una vez en el layout raíz o en cada page.

export function useNostrIdentity() {
  const myPubkey = useGameStore((s) => s.myPubkey)

  useEffect(() => {
    if (myPubkey) return // ya identificado

    async function init() {
      const { setMyPubkey, setError } = useGameStore.getState()
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
  }, [myPubkey])

  return myPubkey
}

// ─── useHostSession ───────────────────────────────────────────────────────────
// Para la página /host. Crea y gestiona la sesión como host.

export function useHostSession() {
  const myPubkey = useNostrIdentity()
  const sessionId = useGameStore((s) => s.sessionId)
  const session = useGameStore((s) => s.session)
  const phase = useGameStore((s) => s.phase)
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex)
  const players = useGameStore((s) => s.players)
  const error = useGameStore((s) => s.error)

  const createSession = useCallback(
    async (opts: { title: string; description?: string; question_count: number }) => {
      const { setIsHost, setSessionId, setPhase, subscribeToSession, setError } =
        useGameStore.getState()
      try {
        setIsHost(true)
        const ndk = await connectNDK()
        const { sessionId: id } = await publishSession(ndk, opts)
        setSessionId(id)
        setPhase("lobby")
        await subscribeToSession(id)
        return id
      } catch (err) {
        setError(`Error al crear sesión: ${err}`)
        return null
      }
    },
    []
  )

  const pushQuestion = useCallback(
    async (index: number, question: QuestionContent) => {
      const { sessionId: sid, session: sess, setCurrentQuestionIndex, setPhase, setError } =
        useGameStore.getState()
      if (!sid || !sess) return

      try {
        const ndk = await connectNDK()
        await publishQuestion(ndk, sid, index, question)
        setCurrentQuestionIndex(index)
        setPhase("question")
      } catch (err) {
        setError(`Error al publicar pregunta: ${err}`)
      }
    },
    []
  )

  const finishSession = useCallback(async () => {
    const { sessionId: sid, session: sess, setPhase, setError } = useGameStore.getState()
    if (!sid || !sess) return

    try {
      const ndk = await connectNDK()
      const content = {
        title: sess.title,
        description: sess.description,
        question_count: sess.question_count,
        created_at: sess.created_at,
      }
      await updateSessionStatus(ndk, sid, "finished", content)
      setPhase("results")
    } catch (err) {
      setError(`Error al finalizar sesión: ${err}`)
    }
  }, [])

  return {
    myPubkey,
    sessionId,
    session,
    phase,
    currentQuestionIndex,
    players,
    error,
    createSession,
    pushQuestion,
    finishSession,
  }
}

// ─── usePlayerSession ─────────────────────────────────────────────────────────
// Para las páginas /join y /play. El jugador se une y responde.

export function usePlayerSession(sessionId: string) {
  const myPubkey = useNostrIdentity()
  const session = useGameStore((s) => s.session)
  const phase = useGameStore((s) => s.phase)
  const currentQuestion = useGameStore(selectCurrentQuestion)
  const hasAnswered = useGameStore((s) => s.hasAnswered)
  const myAnswers = useGameStore((s) => s.myAnswers)
  const leaderboard = useGameStore(selectLeaderboard)
  const answerCount = useGameStore(selectAnswerCount)
  const error = useGameStore((s) => s.error)

  // Suscribirse cuando llega sessionId
  useEffect(() => {
    if (!sessionId) return
    const { subscribeToSession, setIsHost, cleanup } = useGameStore.getState()
    subscribeToSession(sessionId)
    setIsHost(false)

    return () => cleanup()
  }, [sessionId])

  const submitAnswer = useCallback(
    async (selected_index: number) => {
      const {
        sessionId: sid,
        currentQuestionIndex,
        hasAnswered: alreadyAnswered,
        setMyAnswer,
        setHasAnswered,
        setError,
      } = useGameStore.getState()
      if (!sid || alreadyAnswered || currentQuestionIndex < 0) return

      try {
        const ndk = await connectNDK()
        await publishAnswer(ndk, sid, currentQuestionIndex, selected_index)
        setMyAnswer(currentQuestionIndex, selected_index)
        setHasAnswered(true)
      } catch (err) {
        setError(`Error al enviar respuesta: ${err}`)
      }
    },
    []
  )

  return {
    myPubkey,
    session,
    phase,
    currentQuestion,
    hasAnswered,
    myAnswers,
    leaderboard,
    answerCount,
    error,
    submitAnswer,
  }
}

// ─── useLeaderboard ───────────────────────────────────────────────────────────
// Selector derivado, usable en host y player views.

export function useLeaderboard() {
  return useGameStore(selectLeaderboard)
}
