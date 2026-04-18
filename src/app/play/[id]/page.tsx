"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { usePlayerSession } from "@/lib/hooks"
import { Question } from "@/types/nostr"

export default function PlayPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const { myPubkey, currentQuestion, hasAnswered, myAnswers, phase, submitAnswer, error } =
    usePlayerSession(sessionId)

  useEffect(() => {
    if (phase === "results") router.push(`/results/${sessionId}`)
  }, [phase, sessionId, router])

  // Si llegan acá sin login (URL directa), mandamos al lobby para autenticarse.
  useEffect(() => {
    if (!myPubkey) router.replace(`/join/${sessionId}`)
  }, [myPubkey, sessionId, router])

  if (!myPubkey) return null
  if (error) return <ErrorScreen message={error} />
  if (!currentQuestion) return <WaitingScreen />

  return (
    <QuestionScreen
      key={currentQuestion.id}           // re-monta en cada nueva pregunta
      question={currentQuestion}
      hasAnswered={hasAnswered}
      selectedIndex={myAnswers[currentQuestion.index] ?? null}
      onAnswer={submitAnswer}
    />
  )
}

// ─── QuestionScreen ───────────────────────────────────────────────────────────

interface QuestionScreenProps {
  question: Question
  hasAnswered: boolean
  selectedIndex: number | null
  onAnswer: (i: number) => void
}

function QuestionScreen({ question, hasAnswered, selectedIndex, onAnswer }: QuestionScreenProps) {
  const [timeLeft, setTimeLeft] = useState(question.duration)
  const [revealed, setRevealed] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timer local basado en published_at del evento Nostr
  useEffect(() => {
    const start = question.published_at       // ms timestamp
    const end = start + question.duration * 1000

    function tick() {
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        clearInterval(intervalRef.current!)
        setRevealed(true)
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 200)
    return () => clearInterval(intervalRef.current!)
  }, [question])

  // Si ya respondió, revelar respuesta correcta al vencer el timer
  const isTimeUp = timeLeft === 0
  const showCorrect = revealed || (hasAnswered && isTimeUp)

  const handleAnswer = useCallback((i: number) => {
    if (hasAnswered || isTimeUp) return
    onAnswer(i)
  }, [hasAnswered, isTimeUp, onAnswer])

  const progress = timeLeft / question.duration
  const timerColor = progress > 0.5 ? "#f0e040" : progress > 0.25 ? "#fb923c" : "#f87171"

  return (
    <main className="caju-play">
      <div className="caju-play__inner">

        {/* Timer bar */}
        <div className="caju-timer-bar">
          <div
            className="caju-timer-bar__fill"
            style={{
              width: `${progress * 100}%`,
              background: timerColor,
              transition: "width 0.2s linear, background 0.5s ease",
            }}
          />
        </div>

        {/* Header */}
        <div className="caju-play__header">
          <div className="caju-timer-badge" style={{ color: timerColor }}>
            {isTimeUp ? "⏱" : timeLeft}
          </div>
          <span className="caju-play__qnum">
            {question.index + 1}
          </span>
        </div>

        {/* Pregunta */}
        <div className="caju-play__question">
          <h1 className="caju-play__question-text">{question.text}</h1>
        </div>

        {/* Opciones */}
        <div className="caju-play__options">
          {question.options.map((opt, i) => {
            const isSelected = selectedIndex === i
            const isCorrect = i === question.correct_index
            const isWrong = isSelected && !isCorrect

            let state: "default" | "selected" | "correct" | "wrong" | "dimmed" = "default"

            if (showCorrect) {
              if (isCorrect) state = "correct"
              else if (isWrong) state = "wrong"
              else state = "dimmed"
            } else if (isSelected) {
              state = "selected"
            }

            return (
              <button
                key={i}
                className={`caju-option caju-option--${state}`}
                onClick={() => handleAnswer(i)}
                disabled={hasAnswered || isTimeUp}
              >
                <span className="caju-option__letter">{LETTERS[i]}</span>
                <span className="caju-option__text">{opt}</span>
                {showCorrect && isCorrect && (
                  <span className="caju-option__badge">✓</span>
                )}
                {showCorrect && isWrong && (
                  <span className="caju-option__badge caju-option__badge--wrong">✗</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Estado post-respuesta */}
        {hasAnswered && !showCorrect && (
          <div className="caju-play__answered">
            <span className="caju-play__answered-dot" />
            <span>respuesta enviada — esperando tiempo</span>
          </div>
        )}

        {showCorrect && (
          <div className={`caju-play__result ${
            selectedIndex === question.correct_index
              ? "caju-play__result--correct"
              : selectedIndex === null
              ? "caju-play__result--missed"
              : "caju-play__result--wrong"
          }`}>
            {selectedIndex === question.correct_index
              ? "⚡ correcta"
              : selectedIndex === null
              ? "tiempo agotado"
              : "no era esa"}
          </div>
        )}

      </div>

      <style>{playStyles}</style>
    </main>
  )
}

// ─── Pantallas auxiliares ─────────────────────────────────────────────────────

function WaitingScreen() {
  const [dots, setDots] = useState(".")
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500)
    return () => clearInterval(t)
  }, [])
  return (
    <main className="caju-play caju-play--waiting">
      <div className="caju-play__inner caju-play__inner--center">
        <span className="caju-logo">cajú</span>
        <p className="caju-waiting-hint">siguiente pregunta{dots}</p>
      </div>
      <style>{playStyles}</style>
    </main>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="caju-play caju-play--waiting">
      <div className="caju-play__inner caju-play__inner--center">
        <span className="caju-logo">cajú</span>
        <p className="caju-play__error">{message}</p>
      </div>
      <style>{playStyles}</style>
    </main>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LETTERS = ["A", "B", "C", "D"]

// ─── Styles ───────────────────────────────────────────────────────────────────

const playStyles = `
  .caju-play {
    min-height: 100svh;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    font-family: var(--font-display);
    position: relative;
  }

  .caju-play--waiting {
    align-items: center;
    justify-content: center;
  }

  .caju-play__inner {
    width: 100%;
    max-width: var(--w-content);
    margin: 0 auto;
    padding: 0 1.5rem;
    padding-bottom: calc(2rem + var(--safe-bottom));
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    flex: 1;
  }

  .caju-play__inner--center {
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  /* Timer bar */
  .caju-timer-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #1a1a1a;
    z-index: 10;
  }

  .caju-timer-bar__fill {
    height: 100%;
    border-radius: 0 2px 2px 0;
  }

  /* Header */
  .caju-play__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 2rem;
  }

  .caju-timer-badge {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
    transition: color 0.5s ease;
    min-width: 2.5rem;
  }

  .caju-play__qnum {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #333;
    font-family: 'DM Mono', monospace;
  }

  /* Pregunta */
  .caju-play__question {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .caju-play__question-text {
    font-size: clamp(1.3rem, 5vw, 2rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    color: #f5f5f5;
    margin: 0;
    line-height: 1.2;
  }

  /* Opciones */
  .caju-play__options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .caju-option {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-radius: 10px;
    border: 0.5px solid #222;
    background: #141414;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
    position: relative;
    overflow: hidden;
  }

  .caju-option:not(:disabled):hover {
    border-color: #f0e040;
    background: #1a1a00;
  }

  .caju-option:not(:disabled):active {
    transform: scale(0.98);
  }

  .caju-option:disabled {
    cursor: default;
  }

  /* Estados */
  .caju-option--selected {
    border-color: #f0e040 !important;
    background: #1a1900 !important;
  }

  .caju-option--correct {
    border-color: #6ee7b7 !important;
    background: #052015 !important;
  }

  .caju-option--wrong {
    border-color: #f87171 !important;
    background: #1f0808 !important;
  }

  .caju-option--dimmed {
    opacity: 0.35;
  }

  .caju-option__letter {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: #1e1e1e;
    border: 0.5px solid #2a2a2a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #555;
    flex-shrink: 0;
    font-family: 'DM Mono', monospace;
  }

  .caju-option--selected .caju-option__letter {
    background: #f0e040;
    border-color: #f0e040;
    color: #0e0e0e;
  }

  .caju-option--correct .caju-option__letter {
    background: #6ee7b7;
    border-color: #6ee7b7;
    color: #052015;
  }

  .caju-option--wrong .caju-option__letter {
    background: #f87171;
    border-color: #f87171;
    color: #0e0e0e;
  }

  .caju-option__text {
    font-size: 0.95rem;
    font-weight: 400;
    color: #ccc;
    line-height: 1.4;
    flex: 1;
  }

  .caju-option--selected .caju-option__text,
  .caju-option--correct .caju-option__text {
    color: #f5f5f5;
  }

  .caju-option__badge {
    font-size: 1rem;
    color: #6ee7b7;
    flex-shrink: 0;
  }

  .caju-option__badge--wrong {
    color: #f87171;
  }

  /* Feedback */
  .caju-play__answered {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: #444;
    font-family: 'DM Mono', monospace;
  }

  .caju-play__answered-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f0e040;
    animation: cajuPulse 1.2s ease-in-out infinite;
  }

  @keyframes cajuPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .caju-play__result {
    text-align: center;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.75rem;
    border-radius: 8px;
  }

  .caju-play__result--correct {
    color: #6ee7b7;
    background: #052015;
  }

  .caju-play__result--wrong {
    color: #f87171;
    background: #1f0808;
  }

  .caju-play__result--missed {
    color: #555;
    background: #141414;
  }

  /* Misc */
  .caju-logo {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #f0e040;
  }

  .caju-waiting-hint {
    font-size: 0.85rem;
    color: var(--fg-2);
    margin: 0;
    font-family: var(--font-mono);
  }

  .caju-play__error {
    font-size: 0.9rem;
    color: var(--danger);
    background: var(--danger-bg);
    border: 0.5px solid #2a0a0a;
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    text-align: center;
    line-height: 1.5;
    max-width: 320px;
  }
`
