"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function RootPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Pequeño delay para evitar flash en redirect
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <main className="caju-home">
      <div className="caju-home__inner">

        <div className="caju-home__hero">
          <h1 className="caju-home__brand">cajú</h1>
          <p className="caju-home__tagline">quizzes en tiempo real sobre Nostr</p>
        </div>

        <div className="caju-home__actions">
          <button
            className="caju-home__cta"
            onClick={() => router.push("/host")}
          >
            crear quiz →
          </button>

          <div className="caju-home__join">
            <input
              className="caju-home__join-input"
              placeholder="código de sesión"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val) router.push(`/join/${val}`)
                }
              }}
            />
            <span className="caju-home__join-hint">enter ↵</span>
          </div>
        </div>

        <div className="caju-home__footer">
          <span>⚡</span>
          <span>powered by Nostr · identidad soberana · sin backend</span>
        </div>

      </div>

      <style>{homeStyles}</style>
    </main>
  )
}

const homeStyles = `
  .caju-home {
    min-height: 100svh;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    padding-bottom: calc(1.5rem + var(--safe-bottom));
    padding-top: calc(1.5rem + var(--safe-top));
    font-family: var(--font-display);
  }

  .caju-home__inner {
    max-width: 360px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .caju-home__hero {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .caju-home__brand {
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.05em;
    color: var(--accent);
    line-height: 1;
    margin: 0;
  }

  .caju-home__tagline {
    font-size: 0.9rem;
    color: var(--fg-3);
    margin: 0;
    line-height: 1.5;
  }

  .caju-home__actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .caju-home__cta {
    width: 100%;
    padding: 14px;
    border-radius: var(--radius-lg);
    border: none;
    background: var(--accent);
    color: var(--bg);
    font-size: 0.95rem;
    font-weight: 800;
    font-family: var(--font-display);
    letter-spacing: -0.02em;
    cursor: pointer;
    min-height: 44px;
    transition: background 0.15s, transform 0.1s;
  }

  .caju-home__cta:hover { background: var(--accent-hover); }
  .caju-home__cta:active { transform: scale(0.985); }

  .caju-home__join {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 8px 14px;
    border-radius: var(--radius-lg);
    border: 0.5px solid var(--border-2);
    background: var(--bg-card);
    min-height: 44px;
  }

  .caju-home__join:focus-within { border-color: var(--border-3); }

  .caju-home__join-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.9rem;
    font-family: var(--font-mono);
    color: var(--fg-4);
    padding: 8px 0;
    min-width: 0;
  }

  .caju-home__join-input::placeholder { color: var(--fg-2); }

  .caju-home__join-hint {
    font-size: 0.75rem;
    color: var(--fg-2);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .caju-home__footer {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    color: var(--fg-1);
    font-family: var(--font-mono);
    border-top: 0.5px solid var(--border-1);
    padding-top: 1.5rem;
  }
`
