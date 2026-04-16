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
    <main style={{
      minHeight: "100svh",
      background: "#0e0e0e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
      fontFamily: "'Syne', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>

      <div style={{ maxWidth: "360px", width: "100%", display: "flex", flexDirection: "column", gap: "2rem" }}>

        <div>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.05em", color: "#f0e040", lineHeight: 1 }}>
            cajú
          </div>
          <p style={{ fontSize: "0.9rem", color: "#555", marginTop: "0.5rem", lineHeight: 1.5 }}>
            quizzes en tiempo real sobre Nostr
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            onClick={() => router.push("/host")}
            style={{
              width: "100%", padding: "14px",
              borderRadius: "10px", border: "none",
              background: "#f0e040", color: "#0e0e0e",
              fontSize: "0.95rem", fontWeight: 800,
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "-0.02em", cursor: "pointer",
            }}
          >
            crear quiz →
          </button>

          <div style={{
            display: "flex", alignItems: "center",
            gap: "0.75rem", padding: "14px",
            borderRadius: "10px", border: "0.5px solid #1e1e1e",
            background: "#141414",
          }}>
            <input
              placeholder="código de sesión"
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", fontSize: "0.9rem",
                fontFamily: "'DM Mono', monospace", color: "#888",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val) router.push(`/join/${val}`)
                }
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "#333", fontFamily: "'DM Mono', monospace" }}>
              enter ↵
            </span>
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          fontSize: "0.7rem", color: "#2a2a2a",
          fontFamily: "'DM Mono', monospace",
          borderTop: "0.5px solid #1a1a1a", paddingTop: "1.5rem",
        }}>
          <span>⚡</span>
          <span>powered by Nostr · identidad soberana · sin backend</span>
        </div>

      </div>
    </main>
  )
}
