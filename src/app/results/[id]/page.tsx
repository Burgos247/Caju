"use client"

import { useParams } from "next/navigation"
import { usePlayerSession } from "@/lib/hooks"

export default function ResultsPage() {
  const params = useParams()
  const sessionId = params.id as string

  const { session, leaderboard, myPubkey } = usePlayerSession(sessionId)

  return (
    <main className="caju-results">
      <div className="caju-results__inner">

        {/* Header */}
        <div className="caju-results__header">
          <span className="caju-logo">cajú</span>
          <span className="caju-results__badge">final</span>
        </div>

        {/* Título */}
        <div className="caju-results__title-block">
          <p className="caju-results__label">resultados de</p>
          <h1 className="caju-results__title">{session?.title ?? "quiz"}</h1>
        </div>

        {/* Podio top 3 */}
        {leaderboard.length >= 3 && (
          <div className="caju-podium">
            {[1, 0, 2].map((position) => {
              const player = leaderboard[position]
              if (!player) return null
              const isMe = player.pubkey === myPubkey
              const heights = ["80px", "110px", "60px"]
              const ranks = ["2", "1", "3"]
              return (
                <div key={player.pubkey} className={`caju-podium__slot ${isMe ? "caju-podium__slot--me" : ""}`}>
                  <div className="caju-podium__score">{player.score.toLocaleString()}</div>
                  <div
                    className={`caju-podium__bar caju-podium__bar--${ranks[position]}`}
                    style={{ height: heights[position] }}
                  >
                    <span className="caju-podium__rank">{ranks[position]}</span>
                  </div>
                  <div className="caju-podium__key">
                    {isMe ? "tú" : shortKey(player.pubkey)}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Lista completa */}
        <div className="caju-results__list">
          {leaderboard.map((player, i) => {
            const isMe = player.pubkey === myPubkey
            const correctCount = Object.values(player.answers).filter(a => a.correct).length
            const totalAnswered = Object.values(player.answers).length

            return (
              <div
                key={player.pubkey}
                className={`caju-result-row ${isMe ? "caju-result-row--me" : ""}`}
              >
                <span className="caju-result-row__rank">
                  {i === 0 ? "⚡" : i + 1}
                </span>
                <div className="caju-result-row__info">
                  <span className="caju-result-row__key">
                    {isMe ? "tú" : shortKey(player.pubkey)}
                  </span>
                  <span className="caju-result-row__accuracy">
                    {correctCount}/{totalAnswered} correctas
                  </span>
                </div>
                <span className="caju-result-row__score">
                  {player.score.toLocaleString()}
                </span>
              </div>
            )
          })}

          {leaderboard.length === 0 && (
            <p className="caju-results__empty">nadie respondió nada 👀</p>
          )}
        </div>

        {/* Nostr proof footer */}
        <div className="caju-results__footer">
          <span className="caju-results__footer-icon">⚡</span>
          <span>resultados verificables on-relay · Nostr</span>
        </div>

      </div>

      <style>{resultsStyles}</style>
    </main>
  )
}

function shortKey(pubkey: string) {
  return `${pubkey.slice(0, 6)}…${pubkey.slice(-4)}`
}

const resultsStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap');

  .caju-results {
    min-height: 100svh;
    background: #0e0e0e;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 1.5rem;
    font-family: 'Syne', sans-serif;
  }

  .caju-results__inner {
    width: 100%;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding-bottom: 3rem;
  }

  .caju-logo {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #f0e040;
  }

  .caju-results__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .caju-results__badge {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #f0e040;
    background: #1a1900;
    border: 0.5px solid #2a2600;
    padding: 4px 10px;
    border-radius: 4px;
  }

  .caju-results__title-block {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .caju-results__label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #444;
    margin: 0;
  }

  .caju-results__title {
    font-size: clamp(1.75rem, 6vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    color: #f5f5f5;
    margin: 0;
    line-height: 1.1;
  }

  /* Podio */
  .caju-podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 0.5rem;
    padding: 0 1rem;
  }

  .caju-podium__slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
  }

  .caju-podium__slot--me .caju-podium__key {
    color: #f0e040;
  }

  .caju-podium__score {
    font-size: 0.75rem;
    font-weight: 700;
    color: #555;
    font-family: 'DM Mono', monospace;
  }

  .caju-podium__bar {
    width: 100%;
    border-radius: 6px 6px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .caju-podium__bar--1 { background: #f0e040; }
  .caju-podium__bar--2 { background: #888; }
  .caju-podium__bar--3 { background: #6b4c2a; }

  .caju-podium__rank {
    font-size: 1.25rem;
    font-weight: 800;
    color: #0e0e0e;
  }

  .caju-podium__bar--2 .caju-podium__rank,
  .caju-podium__bar--3 .caju-podium__rank {
    color: #f5f5f5;
  }

  .caju-podium__key {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #444;
    font-family: 'DM Mono', monospace;
    text-align: center;
  }

  /* Lista */
  .caju-results__list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .caju-result-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.875rem 1rem;
    border-radius: 8px;
    background: #141414;
    border: 0.5px solid #1e1e1e;
  }

  .caju-result-row--me {
    border-color: #2a2600;
    background: #1a1900;
  }

  .caju-result-row__rank {
    font-size: 0.85rem;
    font-weight: 700;
    color: #444;
    width: 1.5rem;
    text-align: center;
    font-family: 'DM Mono', monospace;
    flex-shrink: 0;
  }

  .caju-result-row__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .caju-result-row__key {
    font-size: 0.85rem;
    font-weight: 700;
    color: #ccc;
    font-family: 'DM Mono', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .caju-result-row--me .caju-result-row__key {
    color: #f0e040;
  }

  .caju-result-row__accuracy {
    font-size: 0.7rem;
    color: #444;
  }

  .caju-result-row__score {
    font-size: 1rem;
    font-weight: 800;
    color: #f5f5f5;
    flex-shrink: 0;
    font-family: 'DM Mono', monospace;
  }

  .caju-results__empty {
    text-align: center;
    color: #333;
    font-size: 0.9rem;
    margin: 1rem 0;
  }

  /* Footer */
  .caju-results__footer {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    color: #333;
    border-top: 0.5px solid #1a1a1a;
    padding-top: 1.5rem;
    font-family: 'DM Mono', monospace;
  }

  .caju-results__footer-icon {
    font-size: 0.9rem;
  }
`
