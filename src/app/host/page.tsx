"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useHostSession } from "@/lib/hooks"
import { useGameStore, selectLeaderboard, selectAnswerCount } from "@/store/gameStore"
import { QuestionContent } from "@/types/nostr"
import { LoginModal } from "@/components/LoginModal"
import { IdentityChip } from "@/components/IdentityChip"

// ─── Page root ────────────────────────────────────────────────────────────────

export default function HostPage() {
  const { myPubkey, phase, sessionId, createSession, pushQuestion, finishSession, error } =
    useHostSession()

  // Sin login no se puede crear quiz — mostramos modal antes que cualquier pantalla.
  if (!myPubkey) return <LoginGate role="host" />

  if (phase === "idle") return <SetupScreen onCreate={createSession} error={error} />
  if (phase === "lobby") return <LobbyScreen sessionId={sessionId!} />
  if (phase === "question")
    return <LiveScreen onPush={pushQuestion} onFinish={finishSession} />
  if (phase === "results") return <FinishedScreen sessionId={sessionId!} />

  return null
}

// ─── 0. Login gate ────────────────────────────────────────────────────────────

function LoginGate({ role }: { role: "host" | "player" }) {
  return (
    <main className="caju-host">
      <div className="caju-host__inner">
        <div className="caju-host__header">
          <span className="caju-logo">cajú</span>
          <span className="caju-host__role">{role}</span>
        </div>
        <div>
          <p className="caju-label">primero lo primero</p>
          <h1 className="caju-section-title">conectá tu Nostr para empezar</h1>
        </div>
        <p className="caju-hint">cajú es 100% Nostr — necesitás una identidad para crear quizzes</p>
      </div>
      <LoginModal isOpen blocking onClose={() => { /* noop — sin login no hay nada que mostrar */ }} />
      <style>{hostStyles}</style>
    </main>
  )
}

// ─── 1. Setup — crear quiz ────────────────────────────────────────────────────

const EMPTY_QUESTION = (): QuestionContent => ({
  text: "",
  options: ["", "", "", ""],
  correct_index: 0,
  duration: 20,
})

function SetupScreen({
  onCreate,
  error,
}: {
  onCreate: (opts: { title: string; description?: string; question_count: number }) => Promise<string | null>
  error: string | null
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [questions, setQuestions] = useState<QuestionContent[]>([EMPTY_QUESTION()])
  const [loading, setLoading] = useState(false)
  const [activeQ, setActiveQ] = useState(0)

  const currentQ = questions[activeQ]

  const updateQuestion = (patch: Partial<QuestionContent>) => {
    setQuestions((qs) =>
      qs.map((q, i) => (i === activeQ ? { ...q, ...patch } : q))
    )
  }

  const updateOption = (optIdx: number, val: string) => {
    const options = [...currentQ.options]
    options[optIdx] = val
    updateQuestion({ options })
  }

  const addQuestion = () => {
    setQuestions((qs) => [...qs, EMPTY_QUESTION()])
    setActiveQ(questions.length)
  }

  const removeQuestion = (i: number) => {
    if (questions.length === 1) return
    setQuestions((qs) => qs.filter((_, idx) => idx !== i))
    setActiveQ((prev) => {
      // Si borramos una pregunta anterior a la activa, el índice se corre hacia abajo.
      const adjusted = i < prev ? prev - 1 : prev
      return Math.min(adjusted, questions.length - 2)
    })
  }

  const handleCreate = async () => {
    if (!title.trim() || questions.some((q) => !q.text.trim())) return
    setLoading(true)
    await onCreate({ title: title.trim(), description: description.trim() || undefined, question_count: questions.length })
    // Las preguntas se almacenan en sessionStorage para pushearlas en orden desde LiveScreen
    sessionStorage.setItem("caju:questions", JSON.stringify(questions))
    setLoading(false)
  }

  const isValid = title.trim().length > 0 && questions.every((q) =>
    q.text.trim() && q.options.every((o) => o.trim())
  )

  return (
    <main className="caju-host">
      <div className="caju-host__inner">

        <div className="caju-host__header">
          <span className="caju-logo">cajú</span>
          <IdentityChip />
        </div>

        {/* Datos del quiz */}
        <section className="caju-section">
          <label className="caju-label">nombre del quiz</label>
          <input
            className="caju-input"
            placeholder="ej. Bitcoin Trivia BA"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
          />
          <input
            className="caju-input caju-input--muted"
            placeholder="descripción opcional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            style={{ marginTop: "8px" }}
          />
        </section>

        {/* Nav de preguntas */}
        <section className="caju-section">
          <div className="caju-q-nav">
            <label className="caju-label">preguntas</label>
            <div className="caju-q-tabs">
              {questions.map((q, i) => (
                <button
                  key={i}
                  className={`caju-q-tab ${i === activeQ ? "caju-q-tab--active" : ""} ${q.text.trim() && q.options.every((o) => o.trim()) ? "caju-q-tab--done" : ""}`}
                  onClick={() => setActiveQ(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button className="caju-q-tab caju-q-tab--add" onClick={addQuestion}>+</button>
            </div>
          </div>

          {/* Editor de pregunta activa */}
          <div className="caju-q-editor">
            <div className="caju-q-editor__header">
              <span className="caju-label">pregunta {activeQ + 1}</span>
              {questions.length > 1 && (
                <button
                  className="caju-btn-ghost caju-btn-ghost--danger"
                  onClick={() => removeQuestion(activeQ)}
                >
                  eliminar
                </button>
              )}
            </div>

            <textarea
              className="caju-textarea"
              placeholder="¿Cuál es el límite de capacidad de un canal Lightning?"
              value={currentQ.text}
              onChange={(e) => updateQuestion({ text: e.target.value })}
              rows={2}
            />

            <div className="caju-options-grid">
              {currentQ.options.map((opt, i) => (
                <div
                  key={i}
                  className={`caju-opt-input ${currentQ.correct_index === i ? "caju-opt-input--correct" : ""}`}
                >
                  <button
                    className="caju-opt-input__letter"
                    onClick={() => updateQuestion({ correct_index: i })}
                    title="marcar como correcta"
                  >
                    {LETTERS[i]}
                  </button>
                  <input
                    className="caju-opt-input__field"
                    placeholder={`opción ${LETTERS[i]}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                  {currentQ.correct_index === i && (
                    <span className="caju-opt-input__check">✓</span>
                  )}
                </div>
              ))}
            </div>

            <div className="caju-duration-row">
              <label className="caju-label">tiempo por pregunta</label>
              <div className="caju-duration-options">
                {[10, 20, 30, 45, 60].map((s) => (
                  <button
                    key={s}
                    className={`caju-duration-btn ${currentQ.duration === s ? "caju-duration-btn--active" : ""}`}
                    onClick={() => updateQuestion({ duration: s })}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {error && <p className="caju-error">{error}</p>}

        <button
          className="caju-btn-primary"
          onClick={handleCreate}
          disabled={!isValid || loading}
        >
          {loading ? "publicando en Nostr…" : `crear sesión · ${questions.length} preguntas`}
        </button>

      </div>
      <style>{hostStyles}</style>
    </main>
  )
}

// ─── 2. Lobby — esperando jugadores ──────────────────────────────────────────

function LobbyScreen({ sessionId }: { sessionId: string }) {
  const playerCount = useGameStore((s) => Object.keys(s.players).length)
  const session = useGameStore((s) => s.session)
  const { pushQuestion } = useHostSession()
  const [starting, setStarting] = useState(false)

  const startGame = async () => {
    setStarting(true)
    try {
      const raw = sessionStorage.getItem("caju:questions")
      if (!raw) return
      const questions: QuestionContent[] = JSON.parse(raw)
      await pushQuestion(0, questions[0])
    } finally {
      setStarting(false)
    }
  }

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${sessionId}`
    : `/join/${sessionId}`

  const copyUrl = () => navigator.clipboard.writeText(joinUrl)

  return (
    <main className="caju-host">
      <div className="caju-host__inner">

        <div className="caju-host__header">
          <span className="caju-logo">cajú</span>
          <div className="caju-host__header-right">
            <div className="caju-live-badge">
              <span className="caju-pulse" />
              lobby
            </div>
            <IdentityChip />
          </div>
        </div>

        <div>
          <p className="caju-label">sesión activa</p>
          <h1 className="caju-section-title">{session?.title}</h1>
        </div>

        {/* QR / link */}
        <div className="caju-join-card">
          <p className="caju-label">link para jugadores</p>
          <div className="caju-join-card__url">
            <span className="caju-join-card__text">/join/{sessionId}</span>
            <button className="caju-btn-ghost" onClick={copyUrl}>copiar</button>
          </div>
          <p className="caju-join-card__hint">
            los jugadores necesitan una identidad Nostr (extensión, nsec o bunker) para entrar
          </p>
        </div>

        {/* Counter */}
        <div className="caju-player-counter">
          <span className="caju-player-counter__num">{playerCount}</span>
          <span className="caju-player-counter__label">
            {playerCount === 1 ? "jugador conectado" : "jugadores conectados"}
          </span>
        </div>

        <button
          className="caju-btn-primary"
          onClick={startGame}
          disabled={starting || playerCount === 0}
        >
          {starting ? "iniciando…" : "empezar juego"}
        </button>

        {playerCount === 0 && (
          <p className="caju-hint">esperando que se una alguien…</p>
        )}

      </div>
      <style>{hostStyles}</style>
    </main>
  )
}

// ─── 3. Live — control de preguntas ──────────────────────────────────────────

function LiveScreen({
  onPush,
  onFinish,
}: {
  onPush: (i: number, q: QuestionContent) => Promise<void>
  onFinish: () => Promise<void>
}) {
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex)
  const currentQuestion = useGameStore((s) => s.questions[s.currentQuestionIndex])
  const session = useGameStore((s) => s.session)
  const playerCount = useGameStore((s) => Object.keys(s.players).length)
  const answerCount = useGameStore(selectAnswerCount)
  const leaderboard = useGameStore(selectLeaderboard)

  const [timeLeft, setTimeLeft] = useState(0)
  const [advancing, setAdvancing] = useState(false)
  const questionsRef = useRef<QuestionContent[] | null>(null)

  // Cargar preguntas desde sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("caju:questions")
    if (raw) questionsRef.current = JSON.parse(raw)
  }, [])

  // Timer sincronizado con el evento Nostr
  useEffect(() => {
    if (!currentQuestion) return
    const end = currentQuestion.published_at + currentQuestion.duration * 1000
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)))
    tick()
    const t = setInterval(tick, 200)
    return () => clearInterval(t)
  }, [currentQuestion])

  const isLastQuestion = session
    ? currentQuestionIndex >= session.question_count - 1
    : false

  const handleNext = useCallback(async () => {
    if (advancing) return
    setAdvancing(true)
    try {
      const qs = questionsRef.current
      if (!qs) return

      if (isLastQuestion) {
        await onFinish()
      } else {
        const nextIndex = currentQuestionIndex + 1
        await onPush(nextIndex, qs[nextIndex])
      }
    } finally {
      setAdvancing(false)
    }
  }, [advancing, currentQuestionIndex, isLastQuestion, onFinish, onPush])

  const totalQuestions = session?.question_count ?? 0
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0
  const answerRatio = playerCount > 0 ? answerCount / playerCount : 0

  return (
    <main className="caju-host caju-host--live">
      <div className="caju-host__inner">

        {/* Header */}
        <div className="caju-host__header">
          <span className="caju-logo">cajú</span>
          <div className="caju-host__header-right">
            <div className="caju-live-badge">
              <span className="caju-pulse" />
              en vivo
            </div>
            <IdentityChip />
          </div>
        </div>

        {/* Progreso del quiz */}
        <div className="caju-progress-block">
          <div className="caju-progress-meta">
            <span className="caju-label">pregunta {currentQuestionIndex + 1} / {totalQuestions}</span>
            <span className="caju-label">{Math.round(progress)}%</span>
          </div>
          <div className="caju-progress-bar">
            <div className="caju-progress-bar__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Pregunta activa */}
        {currentQuestion && (
          <div className="caju-live-question">
            <p className="caju-live-question__text">{currentQuestion.text}</p>
            <div className="caju-live-answers">
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={i}
                  className={`caju-live-answer ${i === currentQuestion.correct_index ? "caju-live-answer--correct" : ""}`}
                >
                  <span className="caju-live-answer__letter">{LETTERS[i]}</span>
                  <span className="caju-live-answer__text">{opt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats en tiempo real */}
        <div className="caju-stats-row">
          <div className="caju-stat">
            <span className="caju-stat__val" style={{ color: timeLeft <= 5 ? "#f87171" : "#f0e040" }}>
              {timeLeft}s
            </span>
            <span className="caju-stat__label">tiempo</span>
          </div>
          <div className="caju-stat">
            <span className="caju-stat__val">{answerCount}</span>
            <span className="caju-stat__label">respuestas</span>
          </div>
          <div className="caju-stat">
            <span className="caju-stat__val">{playerCount}</span>
            <span className="caju-stat__label">jugadores</span>
          </div>
          <div className="caju-stat">
            <div className="caju-answer-ratio">
              <div
                className="caju-answer-ratio__fill"
                style={{ width: `${answerRatio * 100}%` }}
              />
            </div>
            <span className="caju-stat__label">{Math.round(answerRatio * 100)}% respondió</span>
          </div>
        </div>

        {/* Leaderboard live (top 5) */}
        <div className="caju-live-board">
          <p className="caju-label">leaderboard</p>
          {leaderboard.slice(0, 5).map((p, i) => (
            <div key={p.pubkey} className="caju-live-row">
              <span className="caju-live-row__rank">{i + 1}</span>
              <span className="caju-live-row__key">{shortKey(p.pubkey)}</span>
              <div className="caju-live-row__bar-wrap">
                <div
                  className="caju-live-row__bar"
                  style={{
                    width: leaderboard[0]?.score
                      ? `${(p.score / leaderboard[0].score) * 100}%`
                      : "0%",
                  }}
                />
              </div>
              <span className="caju-live-row__score">{p.score.toLocaleString()}</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="caju-hint">nadie respondió aún</p>
          )}
        </div>

        <button
          className="caju-btn-primary"
          onClick={handleNext}
          disabled={advancing}
        >
          {advancing
            ? "publicando…"
            : isLastQuestion
            ? "finalizar quiz"
            : `siguiente pregunta →`}
        </button>

      </div>
      <style>{hostStyles}</style>
    </main>
  )
}

// ─── 4. Finished ──────────────────────────────────────────────────────────────

function FinishedScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const leaderboard = useGameStore(selectLeaderboard)
  const session = useGameStore((s) => s.session)

  return (
    <main className="caju-host">
      <div className="caju-host__inner">

        <div className="caju-host__header">
          <span className="caju-logo">cajú</span>
          <div className="caju-host__header-right">
            <span className="caju-finished-badge">terminado</span>
            <IdentityChip />
          </div>
        </div>

        <div>
          <p className="caju-label">quiz finalizado</p>
          <h1 className="caju-section-title">{session?.title}</h1>
        </div>

        <div className="caju-final-board">
          {leaderboard.slice(0, 10).map((p, i) => {
            const correct = Object.values(p.answers).filter((a) => a.correct).length
            const total = Object.values(p.answers).length
            return (
              <div key={p.pubkey} className={`caju-final-row ${i === 0 ? "caju-final-row--winner" : ""}`}>
                <span className="caju-final-row__rank">{i === 0 ? "⚡" : i + 1}</span>
                <div className="caju-final-row__info">
                  <span className="caju-final-row__key">{shortKey(p.pubkey)}</span>
                  <span className="caju-final-row__acc">{correct}/{total} correctas</span>
                </div>
                <span className="caju-final-row__score">{p.score.toLocaleString()}</span>
              </div>
            )
          })}
        </div>

        <div className="caju-finished-actions">
          <button
            className="caju-btn-primary"
            onClick={() => router.push(`/results/${sessionId}`)}
          >
            ver pantalla de resultados
          </button>
          <button
            className="caju-btn-ghost"
            onClick={() => router.push("/host")}
          >
            nuevo quiz
          </button>
        </div>

      </div>
      <style>{hostStyles}</style>
    </main>
  )
}

// ─── Utils ────────────────────────────────────────────────────────────────────

const LETTERS = ["A", "B", "C", "D"]
const shortKey = (pk: string) => `${pk.slice(0, 6)}…${pk.slice(-4)}`

// ─── Styles ───────────────────────────────────────────────────────────────────

const hostStyles = `
  .caju-host {
    min-height: 100svh;
    background: var(--bg);
    display: flex;
    justify-content: center;
    padding: 1.5rem;
    padding-top: calc(1.5rem + var(--safe-top));
    padding-bottom: calc(3rem + var(--safe-bottom));
    font-family: var(--font-display);
  }

  .caju-host--live {
    align-items: flex-start;
  }

  .caju-host__inner {
    width: 100%;
    max-width: var(--w-wide);
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  /* Header */
  .caju-host__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .caju-logo {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #f0e040;
  }

  .caju-host__header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .caju-host__role {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #333;
    font-family: 'DM Mono', monospace;
  }

  .caju-live-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6ee7b7;
    font-family: 'DM Mono', monospace;
  }

  .caju-finished-badge {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #f0e040;
    font-family: 'DM Mono', monospace;
  }

  .caju-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6ee7b7;
    animation: cajuPulse 1.4s ease-in-out infinite;
  }

  @keyframes cajuPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  /* Typography */
  .caju-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #444;
    display: block;
    margin-bottom: 6px;
  }

  .caju-section-title {
    font-size: clamp(1.5rem, 5vw, 2rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #f5f5f5;
    margin: 0;
    line-height: 1.1;
  }

  .caju-hint {
    font-size: 0.8rem;
    color: #333;
    margin: 0;
    font-family: 'DM Mono', monospace;
    text-align: center;
  }

  .caju-error {
    font-size: 0.85rem;
    color: #f87171;
    margin: 0;
  }

  /* Section */
  .caju-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Inputs */
  .caju-input {
    width: 100%;
    background: #141414;
    border: 0.5px solid #222;
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 0.95rem;
    font-family: 'Syne', sans-serif;
    font-weight: 400;
    color: #f5f5f5;
    outline: none;
    transition: border-color 0.15s;
  }

  .caju-input:focus {
    border-color: #f0e040;
  }

  .caju-input--muted {
    color: #888;
    font-size: 0.85rem;
  }

  .caju-input::placeholder { color: #333; }

  .caju-textarea {
    width: 100%;
    background: #141414;
    border: 0.5px solid #222;
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 0.95rem;
    font-family: 'Syne', sans-serif;
    color: #f5f5f5;
    outline: none;
    resize: vertical;
    transition: border-color 0.15s;
    min-height: 72px;
  }

  .caju-textarea:focus { border-color: #f0e040; }
  .caju-textarea::placeholder { color: #333; }

  /* Question tabs */
  .caju-q-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .caju-q-nav .caju-label { margin-bottom: 0; }

  .caju-q-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .caju-q-tab {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 0.5px solid #2a2a2a;
    background: #141414;
    color: #555;
    font-size: 0.75rem;
    font-weight: 700;
    font-family: 'DM Mono', monospace;
    cursor: pointer;
    transition: all 0.12s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .caju-q-tab:hover { border-color: #555; color: #aaa; }

  .caju-q-tab--active {
    border-color: #f0e040 !important;
    color: #f0e040 !important;
    background: #1a1900 !important;
  }

  .caju-q-tab--done {
    border-color: #6ee7b7;
    color: #6ee7b7;
  }

  .caju-q-tab--add {
    color: #333;
    font-size: 1.1rem;
    border-style: dashed;
  }

  .caju-q-tab--add:hover { color: #f0e040; border-color: #f0e040; }

  /* Question editor */
  .caju-q-editor {
    background: #141414;
    border: 0.5px solid #1e1e1e;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .caju-q-editor__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .caju-q-editor__header .caju-label { margin-bottom: 0; }

  /* Options grid */
  .caju-options-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .caju-opt-input {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 7px;
    border: 0.5px solid #2a2a2a;
    background: #0e0e0e;
    transition: border-color 0.12s;
  }

  .caju-opt-input--correct {
    border-color: #6ee7b7;
    background: #031a0f;
  }

  .caju-opt-input__letter {
    width: 24px;
    height: 24px;
    border-radius: 5px;
    background: #1a1a1a;
    border: 0.5px solid #2a2a2a;
    color: #444;
    font-size: 0.7rem;
    font-weight: 700;
    font-family: 'DM Mono', monospace;
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
  }

  .caju-opt-input--correct .caju-opt-input__letter {
    background: #6ee7b7;
    border-color: #6ee7b7;
    color: #031a0f;
  }

  .caju-opt-input__field {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.875rem;
    font-family: 'Syne', sans-serif;
    color: #ccc;
  }

  .caju-opt-input__field::placeholder { color: #2a2a2a; }

  .caju-opt-input__check {
    font-size: 0.85rem;
    color: #6ee7b7;
    flex-shrink: 0;
  }

  /* Duration */
  .caju-duration-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .caju-duration-row .caju-label { margin-bottom: 0; flex-shrink: 0; }

  .caju-duration-options {
    display: flex;
    gap: 4px;
  }

  .caju-duration-btn {
    padding: 4px 10px;
    border-radius: 5px;
    border: 0.5px solid #2a2a2a;
    background: #0e0e0e;
    color: #444;
    font-size: 0.75rem;
    font-weight: 700;
    font-family: 'DM Mono', monospace;
    cursor: pointer;
    transition: all 0.12s;
  }

  .caju-duration-btn:hover { border-color: #555; color: #aaa; }

  .caju-duration-btn--active {
    border-color: #f0e040;
    color: #f0e040;
    background: #1a1900;
  }

  /* Buttons */
  .caju-btn-primary {
    width: 100%;
    padding: 14px;
    border-radius: 10px;
    border: none;
    background: #f0e040;
    color: #0e0e0e;
    font-size: 0.95rem;
    font-weight: 800;
    font-family: 'Syne', sans-serif;
    cursor: pointer;
    letter-spacing: -0.02em;
    transition: all 0.15s;
  }

  .caju-btn-primary:hover:not(:disabled) { background: #ffe820; }
  .caju-btn-primary:active:not(:disabled) { transform: scale(0.98); }
  .caju-btn-primary:disabled { opacity: 0.35; cursor: default; }

  .caju-btn-ghost {
    background: transparent;
    border: 0.5px solid #2a2a2a;
    border-radius: 7px;
    padding: 6px 12px;
    color: #555;
    font-size: 0.8rem;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    cursor: pointer;
    transition: all 0.12s;
  }

  .caju-btn-ghost:hover { border-color: #555; color: #aaa; }

  .caju-btn-ghost--danger:hover { border-color: #f87171; color: #f87171; }

  /* Lobby */
  .caju-join-card {
    background: #141414;
    border: 0.5px solid #1e1e1e;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .caju-join-card__url {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: #0e0e0e;
    border: 0.5px solid #2a2a2a;
    border-radius: 7px;
    padding: 10px 12px;
  }

  .caju-join-card__text {
    font-family: 'DM Mono', monospace;
    font-size: 0.85rem;
    color: #888;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .caju-join-card__hint {
    font-size: 0.75rem;
    color: #333;
    margin: 0;
    line-height: 1.5;
  }

  .caju-player-counter {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .caju-player-counter__num {
    font-size: 3rem;
    font-weight: 800;
    color: #f0e040;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .caju-player-counter__label {
    font-size: 0.85rem;
    color: #555;
    font-weight: 700;
  }

  /* Live screen */
  .caju-progress-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .caju-progress-meta {
    display: flex;
    justify-content: space-between;
  }

  .caju-progress-meta .caju-label { margin-bottom: 0; }

  .caju-progress-bar {
    height: 3px;
    background: #1a1a1a;
    border-radius: 2px;
    overflow: hidden;
  }

  .caju-progress-bar__fill {
    height: 100%;
    background: #f0e040;
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  .caju-live-question {
    background: #141414;
    border: 0.5px solid #1e1e1e;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .caju-live-question__text {
    font-size: 1rem;
    font-weight: 700;
    color: #f5f5f5;
    line-height: 1.3;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .caju-live-answers {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .caju-live-answer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 6px;
    border: 0.5px solid #1e1e1e;
    background: #0e0e0e;
  }

  .caju-live-answer--correct {
    border-color: #6ee7b7;
    background: #031a0f;
  }

  .caju-live-answer__letter {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 700;
    color: #444;
    flex-shrink: 0;
    font-family: 'DM Mono', monospace;
  }

  .caju-live-answer--correct .caju-live-answer__letter {
    background: #6ee7b7;
    color: #031a0f;
  }

  .caju-live-answer__text {
    font-size: 0.8rem;
    color: #888;
  }

  .caju-live-answer--correct .caju-live-answer__text {
    color: #6ee7b7;
    font-weight: 700;
  }

  /* Stats row */
  .caju-stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .caju-stat {
    background: #141414;
    border: 0.5px solid #1e1e1e;
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: center;
  }

  .caju-stat__val {
    font-size: 1.25rem;
    font-weight: 800;
    color: #f5f5f5;
    line-height: 1;
    font-family: 'DM Mono', monospace;
  }

  .caju-stat__label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #333;
    text-align: center;
  }

  .caju-answer-ratio {
    width: 100%;
    height: 4px;
    background: #1e1e1e;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 2px;
  }

  .caju-answer-ratio__fill {
    height: 100%;
    background: #6ee7b7;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  /* Live leaderboard */
  .caju-live-board {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .caju-live-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 0.5px solid #1a1a1a;
  }

  .caju-live-row__rank {
    width: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    color: #333;
    text-align: center;
    font-family: 'DM Mono', monospace;
    flex-shrink: 0;
  }

  .caju-live-row__key {
    font-size: 0.75rem;
    color: #555;
    font-family: 'DM Mono', monospace;
    width: 100px;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .caju-live-row__bar-wrap {
    flex: 1;
    height: 4px;
    background: #1a1a1a;
    border-radius: 2px;
    overflow: hidden;
  }

  .caju-live-row__bar {
    height: 100%;
    background: #f0e040;
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  .caju-live-row__score {
    font-size: 0.8rem;
    font-weight: 700;
    color: #888;
    font-family: 'DM Mono', monospace;
    width: 52px;
    text-align: right;
    flex-shrink: 0;
  }

  /* Final screen */
  .caju-final-board {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .caju-final-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #141414;
    border: 0.5px solid #1e1e1e;
  }

  .caju-final-row--winner {
    border-color: #2a2600;
    background: #1a1900;
  }

  .caju-final-row__rank {
    font-size: 0.85rem;
    font-weight: 700;
    color: #333;
    width: 1.5rem;
    text-align: center;
    font-family: 'DM Mono', monospace;
    flex-shrink: 0;
  }

  .caju-final-row--winner .caju-final-row__rank {
    color: #f0e040;
  }

  .caju-final-row__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .caju-final-row__key {
    font-size: 0.85rem;
    font-weight: 700;
    color: #888;
    font-family: 'DM Mono', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .caju-final-row--winner .caju-final-row__key { color: #f0e040; }

  .caju-final-row__acc {
    font-size: 0.7rem;
    color: #333;
  }

  .caju-final-row__score {
    font-size: 1rem;
    font-weight: 800;
    color: #f5f5f5;
    font-family: 'DM Mono', monospace;
    flex-shrink: 0;
  }

  .caju-finished-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
`
