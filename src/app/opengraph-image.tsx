import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "cajú — quizzes en tiempo real sobre Nostr"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0e0e0e",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 96px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "#f0e040",
            letterSpacing: "-0.05em",
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          cajú
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "#555",
            letterSpacing: "-0.01em",
            marginBottom: 64,
          }}
        >
          quizzes en tiempo real sobre Nostr
        </div>

        {/* Pills */}
        <div style={{ display: "flex", gap: 12 }}>
          {["⚡ Lightning", "Nostr nativo", "sin backend"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid #2a2a2a",
                background: "#141414",
                color: "#555",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
