"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { usePlayerSession } from "@/lib/hooks"
import { selectPlayerCount } from "@/store/gameStore"
import { useGameStore } from "@/store/gameStore"

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const { session, phase, myPubkey, error } = usePlayerSession(sessionId)
  const playerCount = useGameStore(selectPlayerCount)
  const [dots, setDots] = useState(".")

  // Animación de puntos suspensivos
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 600)
    return () => clearInterval(t)
  }, [])

  // Redirigir cuando arranca la partida
  useEffect(() => {
    if (phase === "question") router.push(`/play/${sessionId}`)
    if (phase === "results") router.push(`/results/${sessionId}`)
  }, [phase, sessionId, router])

  if (error) return <ErrorScreen message={error} />
  if (!session) return <LoadingScreen sessionId={sessionId} />

  const shortPubkey = myPubkey
    ? `${myPubkey.slice(0, 6)}…${myPubkey.slice(-4)}`
    : "conectando…"

  return (
    <main className="caju-lobby">
      <div className="caju-lobby__inner">

        {/* Header */}
        <div className="caju-lobby__header">
          <span className="caju-logo">cajú</span>
          <div className="caju-lobby__status">
            <span className="caju-pulse" />
            <span>en vivo</span>
          </div>
        </div>

        {/* Nombre del quiz */}
        <div className="caju-lobby__game">
          <p className="caju-lobby__label">entraste a</p>
          <h1 className="caju-lobby__title">{session.title}</h1>
          {session.description && (
            <p className="caju-lobby__desc">{session.description}</p>
          )}
        </div>

        {/* Sala de espera */}
        <div className="caju-lobby__waiting">
          <div className="caju-waiting-ring">
            <div className="caju-waiting-ring__inner">
              <span className="caju-waiting-ring__count">{playerCount}</span>
              <span className="caju-waiting-ring__label">jugadores</span>
            </div>
          </div>
          <p className="caju-lobby__waiting-text">
            esperando al host{dots}
          </p>
        </div>

        {/* Identidad del jugador */}
        <div className="caju-lobby__identity">
          <div className="caju-identity-chip">
            <span className="caju-identity-chip__dot" />
            <span className="caju-identity-chip__key">{shortPubkey}</span>
          </div>
          <p className="caju-lobby__identity-hint">
            {myPubkey ? "identificado via Nostr" : "generando identidad…"}
          </p>
        </div>

        {/* Info sesión */}
        <div className="caju-lobby__meta">
          <div className="caju-meta-item">
            <span className="caju-meta-item__val">{session.question_count}</span>
            <span className="caju-meta-item__label">preguntas</span>
          </div>
          <div className="caju-meta-divider" />
          <div className="caju-meta-item">
            <span className="caju-meta-item__val">⚡</span>
            <span className="caju-meta-item__label">Nostr nativo</span>
          </div>
        </div>
      </div>

      <style>{lobbyStyles}</style>
    </main>
  )
}

function LoadingScreen({ sessionId }: { sessionId: string }) {
  return (
    <main className="caju-lobby">
      <div className="caju-lobby__inner caju-lobby__inner--loading">
        <span className="caju-logo">cajú</span>
        <p className="caju-loading-text">buscando sesión <code>{sessionId}</code>…</p>
      </div>
      <style>{lobbyStyles}</style>
    </main>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="caju-lobby">
      <div className="caju-lobby__inner caju-lobby__inner--error">
        <span className="caju-logo">cajú</span>
        <p className="caju-error-text">{message}</p>
      </div>
      <style>{lobbyStyles}</style>
    </main>
  )
}

const lobbyStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap');

  .caju-lobby {
    min-height: 100svh;
    background: #0e0e0e;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    font-family: 'Syne', sans-serif;
  }

  .caju-lobby__inner {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .caju-lobby__inner--loading,
  .caju-lobby__inner--error {
    align-items: center;
    gap: 1.5rem;
  }

  /* Logo */
  .caju-logo {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #f0e040;
  }

  /* Header */
  .caju-lobby__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .caju-lobby__status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6ee7b7;
  }

  .caju-pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #6ee7b7;
    animation: cajuPulse 1.4s ease-in-out infinite;
  }

  @keyframes cajuPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  /* Game info */
  .caju-lobby__game {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .caju-lobby__label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #555;
    margin: 0;
  }

  .caju-lobby__title {
    font-size: clamp(1.75rem, 6vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #f5f5f5;
    margin: 0;
    line-height: 1.1;
  }

  .caju-lobby__desc {
    font-size: 0.9rem;
    color: #666;
    margin: 0;
    line-height: 1.5;
  }

  /* Waiting ring */
  .caju-lobby__waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .caju-waiting-ring {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: conic-gradient(#f0e040 0%, #f0e04022 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: cajuSpin 3s linear infinite;
  }

  @keyframes cajuSpin {
    to { transform: rotate(360deg); }
  }

  .caju-waiting-ring__inner {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: #0e0e0e;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    animation: cajuSpin 3s linear infinite reverse;
  }

  .caju-waiting-ring__count {
    font-size: 2rem;
    font-weight: 800;
    color: #f0e040;
    line-height: 1;
  }

  .caju-waiting-ring__label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #555;
  }

  .caju-lobby__waiting-text {
    font-size: 0.85rem;
    color: #444;
    margin: 0;
    font-family: 'DM Mono', monospace;
  }

  /* Identity chip */
  .caju-lobby__identity {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }

  .caju-identity-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1a1a1a;
    border: 0.5px solid #2a2a2a;
    border-radius: 6px;
    padding: 6px 12px;
  }

  .caju-identity-chip__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6ee7b7;
    flex-shrink: 0;
  }

  .caju-identity-chip__key {
    font-family: 'DM Mono', monospace;
    font-size: 0.8rem;
    color: #888;
    letter-spacing: 0.02em;
  }

  .caju-lobby__identity-hint {
    font-size: 0.7rem;
    color: #333;
    margin: 0;
    padding-left: 2px;
  }

  /* Meta */
  .caju-lobby__meta {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    border-top: 0.5px solid #1e1e1e;
    padding-top: 1.5rem;
  }

  .caju-meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .caju-meta-item__val {
    font-size: 1.25rem;
    font-weight: 800;
    color: #f5f5f5;
    line-height: 1;
  }

  .caju-meta-item__label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #444;
  }

  .caju-meta-divider {
    width: 0.5px;
    height: 32px;
    background: #2a2a2a;
  }

  /* Loading / Error */
  .caju-loading-text,
  .caju-error-text {
    font-size: 0.9rem;
    color: #444;
    margin: 0;
    text-align: center;
  }

  .caju-loading-text code {
    font-family: 'DM Mono', monospace;
    color: #666;
  }

  .caju-error-text {
    color: #f87171;
  }
`
