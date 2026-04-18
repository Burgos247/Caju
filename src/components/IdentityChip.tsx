"use client"

import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "@/store/authStore"

interface IdentityChipProps {
  // Variante visual: "compact" (header), "full" (panel destacado)
  variant?: "compact" | "full"
}

export function IdentityChip({ variant = "compact" }: IdentityChipProps) {
  const profile = useAuthStore((s) => s.profile)
  const loginMethod = useAuthStore((s) => s.loginMethod)
  const logout = useAuthStore((s) => s.logout)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isGuest = loginMethod === "guest"

  // Cerrar al click afuera
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  if (!profile) return null

  const label = isGuest
    ? `invitado · ${shortNpub(profile.npub).split("…")[0].slice(-4)}`
    : profile.name || shortNpub(profile.npub)
  const initial = isGuest
    ? "?"
    : (profile.name || profile.npub.replace(/^npub1/, "")).charAt(0).toUpperCase()

  return (
    <div
      ref={ref}
      className={`caju-identity-chip caju-identity-chip--${variant}`}
    >
      <button
        className="caju-identity-chip__btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="cuenta"
      >
        {profile.picture ? (
          // Nostr profile pics come from arbitrary remote hosts — next/image requires
          // a closed list of remotePatterns. Plain <img> is the right call here.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="caju-identity-chip__avatar" src={profile.picture} alt="" />
        ) : (
          <span className="caju-identity-chip__avatar caju-identity-chip__avatar--initial">
            {initial}
          </span>
        )}
        <span className="caju-identity-chip__label">{label}</span>
        <span className="caju-identity-chip__caret">▾</span>
      </button>

      {open && (
        <div className="caju-identity-chip__menu">
          <div className="caju-identity-chip__menu-info">
            <span className="caju-identity-chip__menu-name">
              {isGuest ? "invitado" : profile.name || "anónimo"}
            </span>
            <code className="caju-identity-chip__menu-npub">{shortNpub(profile.npub)}</code>
            {isGuest && (
              <span className="caju-identity-chip__menu-warn">
                identidad efímera · se borra al cerrar la pestaña
              </span>
            )}
          </div>
          <button
            className="caju-identity-chip__menu-item caju-identity-chip__menu-item--danger"
            onClick={() => {
              logout()
              setOpen(false)
            }}
          >
            cerrar sesión
          </button>
        </div>
      )}

      <style>{chipStyles}</style>
    </div>
  )
}

function shortNpub(npub: string): string {
  return `${npub.slice(0, 10)}…${npub.slice(-4)}`
}

const chipStyles = `
  .caju-identity-chip {
    position: relative;
    font-family: 'Syne', sans-serif;
  }

  .caju-identity-chip__btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #141414;
    border: 0.5px solid #2a2a2a;
    border-radius: 8px;
    padding: 5px 10px 5px 5px;
    cursor: pointer;
    transition: border-color 0.12s;
    color: #ccc;
  }

  .caju-identity-chip__btn:hover { border-color: #555; }

  .caju-identity-chip--full .caju-identity-chip__btn {
    padding: 8px 14px 8px 8px;
  }

  .caju-identity-chip__avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    background: #1a1a1a;
  }

  .caju-identity-chip--full .caju-identity-chip__avatar {
    width: 28px;
    height: 28px;
  }

  .caju-identity-chip__avatar--initial {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 800;
    color: #f0e040;
    background: #1a1900;
    border: 0.5px solid #2a2600;
  }

  .caju-identity-chip__label {
    font-family: 'DM Mono', monospace;
    font-size: 0.78rem;
    color: #aaa;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .caju-identity-chip--full .caju-identity-chip__label {
    font-size: 0.85rem;
    max-width: 180px;
  }

  .caju-identity-chip__caret {
    font-size: 0.65rem;
    color: #555;
  }

  .caju-identity-chip__menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 220px;
    background: #141414;
    border: 0.5px solid #2a2a2a;
    border-radius: 9px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .caju-identity-chip__menu-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-bottom: 0.5px solid #1e1e1e;
    margin-bottom: 4px;
  }

  .caju-identity-chip__menu-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #f5f5f5;
  }

  .caju-identity-chip__menu-npub {
    font-family: 'DM Mono', monospace;
    font-size: 0.7rem;
    color: #555;
  }

  .caju-identity-chip__menu-warn {
    font-size: 0.65rem;
    color: #fb923c;
    margin-top: 4px;
    line-height: 1.4;
  }

  .caju-identity-chip__menu-item {
    background: transparent;
    border: none;
    border-radius: 6px;
    padding: 8px 10px;
    text-align: left;
    color: #ccc;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: 'Syne', sans-serif;
    cursor: pointer;
    transition: all 0.12s;
  }

  .caju-identity-chip__menu-item:hover {
    background: #1e1e1e;
    color: #f5f5f5;
  }

  .caju-identity-chip__menu-item--danger:hover {
    background: #2a0a0a;
    color: #f87171;
  }
`
