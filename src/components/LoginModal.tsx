"use client"

import { useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import {
  loginWithExtension,
  loginWithNsec,
  loginWithBunker,
  createNostrConnectSession,
  type LoginMethod,
  type NostrConnectSession,
} from "@/lib/nostr"
import { useAuthStore } from "@/store/authStore"

type Tab = "extension" | "nsec" | "bunker"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const setUser = useAuthStore((s) => s.setUser)
  const lastMethod = useAuthStore((s) => s.loginMethod)

  const hasExtension = typeof window !== "undefined" && !!window.nostr
  const defaultTab: Tab =
    (lastMethod as Tab | null) ?? (hasExtension ? "extension" : "nsec")

  const [tab, setTab] = useState<Tab>(defaultTab)
  const [busy, setBusy] = useState<LoginMethod | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Inputs
  const [nsec, setNsec] = useState("")
  const [bunkerUrl, setBunkerUrl] = useState("")

  // NostrConnect QR
  const [qrSession, setQrSession] = useState<NostrConnectSession | null>(null)
  // Una vez paireado, NO cancelamos el signer en cleanup — sigue activo para firmar.
  const qrPairedRef = useRef(false)

  // Reset state al abrir
  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setBusy(null)
  }, [isOpen])

  // Cleanup QR session on unmount sólo si no llegamos a parear.
  useEffect(() => {
    return () => {
      if (!qrPairedRef.current) qrSession?.cancel()
    }
  }, [qrSession])

  const handle = async (
    method: LoginMethod,
    fn: () => Promise<{ user: Awaited<ReturnType<typeof loginWithExtension>> }>
  ) => {
    setBusy(method)
    setError(null)
    try {
      const { user } = await fn()
      await setUser(user, method)
      // Métodos no-QR — si había un QR colgado lo descartamos.
      if (qrSession && !qrPairedRef.current) qrSession.cancel()
      setQrSession(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const onExtension = () =>
    handle("extension", async () => ({ user: await loginWithExtension() }))

  const onNsec = () => handle("nsec", async () => ({ user: await loginWithNsec(nsec) }))

  const onBunker = () =>
    handle("bunker", async () => ({ user: await loginWithBunker(bunkerUrl) }))

  const startQrFlow = async () => {
    setError(null)
    setBusy("bunker")
    qrPairedRef.current = false
    try {
      const session = await createNostrConnectSession()
      setQrSession(session)
      const user = await session.waitForConnection()
      qrPairedRef.current = true
      await setUser(user, "bunker")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="caju-login-overlay" onClick={onClose}>
      <div className="caju-login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="caju-login-modal__header">
          <span className="caju-logo">cajú</span>
          <button className="caju-login-modal__close" onClick={onClose} aria-label="cerrar">
            ×
          </button>
        </div>

        <h2 className="caju-login-modal__title">conectar con Nostr</h2>
        <p className="caju-login-modal__sub">elegí cómo querés identificarte</p>

        <div className="caju-login-tabs">
          <button
            className={`caju-login-tab ${tab === "extension" ? "caju-login-tab--active" : ""}`}
            onClick={() => setTab("extension")}
            disabled={!hasExtension}
            title={hasExtension ? "" : "no detectamos ninguna extensión NIP-07"}
          >
            extensión
          </button>
          <button
            className={`caju-login-tab ${tab === "nsec" ? "caju-login-tab--active" : ""}`}
            onClick={() => setTab("nsec")}
          >
            nsec
          </button>
          <button
            className={`caju-login-tab ${tab === "bunker" ? "caju-login-tab--active" : ""}`}
            onClick={() => setTab("bunker")}
          >
            bunker
          </button>
        </div>

        <div className="caju-login-body">
          {tab === "extension" && (
            <div className="caju-login-pane">
              <p className="caju-login-pane__hint">
                {hasExtension
                  ? "te vamos a pedir permiso desde tu extensión Nostr (Alby, nos2x, Nostore…)"
                  : "no detectamos extensión NIP-07. instalá Alby o nos2x, o usá otro método."}
              </p>
              <button
                className="caju-btn-primary"
                onClick={onExtension}
                disabled={!hasExtension || busy !== null}
              >
                {busy === "extension" ? "esperando aprobación…" : "conectar con extensión"}
              </button>
            </div>
          )}

          {tab === "nsec" && (
            <div className="caju-login-pane">
              <p className="caju-login-pane__hint">
                pegá tu clave privada (<code>nsec1…</code>). nunca se guarda en este dispositivo —
                la próxima vez vas a tener que pegarla otra vez.
              </p>
              <input
                className="caju-input"
                type="password"
                placeholder="nsec1…"
                value={nsec}
                onChange={(e) => setNsec(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="caju-btn-primary"
                onClick={onNsec}
                disabled={!nsec.trim() || busy !== null}
              >
                {busy === "nsec" ? "verificando…" : "iniciar sesión"}
              </button>
            </div>
          )}

          {tab === "bunker" && (
            <div className="caju-login-pane">
              <p className="caju-login-pane__hint">
                escaneá el QR desde tu app Nostr (nsec.app, Amber…) o pegá una URL
                <code> bunker://</code>.
              </p>

              {!qrSession ? (
                <button
                  className="caju-btn-secondary"
                  onClick={startQrFlow}
                  disabled={busy !== null}
                >
                  {busy === "bunker" ? "generando QR…" : "generar QR (NostrConnect)"}
                </button>
              ) : (
                <div className="caju-login-qr">
                  <div className="caju-login-qr__frame">
                    <QRCodeSVG value={qrSession.uri} size={200} bgColor="#0e0e0e" fgColor="#f5f5f5" />
                  </div>
                  <p className="caju-login-qr__hint">esperando conexión…</p>
                  <button
                    className="caju-btn-ghost"
                    onClick={() => {
                      qrSession.cancel()
                      setQrSession(null)
                      setBusy(null)
                    }}
                  >
                    cancelar
                  </button>
                </div>
              )}

              <div className="caju-login-divider">o</div>

              <input
                className="caju-input"
                type="text"
                placeholder="bunker://npub…@relay.nsec.app?secret=…"
                value={bunkerUrl}
                onChange={(e) => setBunkerUrl(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="caju-btn-primary"
                onClick={onBunker}
                disabled={!bunkerUrl.trim() || busy !== null}
              >
                {busy === "bunker" && !qrSession ? "conectando…" : "conectar bunker"}
              </button>
            </div>
          )}
        </div>

        {error && <p className="caju-login-error">{error}</p>}

        <p className="caju-login-modal__footer">
          ⚡ identidad on-relay · sin servidores
        </p>
      </div>

      <style>{loginStyles}</style>
    </div>
  )
}

const loginStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .caju-login-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    z-index: 1000;
    font-family: 'Syne', sans-serif;
  }

  .caju-login-modal {
    width: 100%;
    max-width: 420px;
    background: #141414;
    border: 0.5px solid #2a2a2a;
    border-radius: 14px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    color: #f5f5f5;
  }

  .caju-login-modal__header {
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

  .caju-login-modal__close {
    background: transparent;
    border: none;
    color: #555;
    font-size: 1.6rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 6px;
  }

  .caju-login-modal__close:hover { color: #aaa; }

  .caju-login-modal__title {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    margin: 0;
    line-height: 1.1;
  }

  .caju-login-modal__sub {
    font-size: 0.85rem;
    color: #666;
    margin: -0.6rem 0 0;
  }

  .caju-login-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    background: #0e0e0e;
    border: 0.5px solid #1e1e1e;
    border-radius: 8px;
    padding: 4px;
  }

  .caju-login-tab {
    padding: 8px 6px;
    border-radius: 5px;
    background: transparent;
    border: none;
    color: #555;
    font-size: 0.78rem;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    cursor: pointer;
    text-transform: lowercase;
    letter-spacing: 0.02em;
    transition: all 0.12s;
  }

  .caju-login-tab:hover:not(:disabled) { color: #ccc; }
  .caju-login-tab:disabled { opacity: 0.35; cursor: not-allowed; }

  .caju-login-tab--active {
    background: #1a1900;
    color: #f0e040;
  }

  .caju-login-body {
    min-height: 180px;
  }

  .caju-login-pane {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .caju-login-pane__hint {
    font-size: 0.82rem;
    color: #888;
    line-height: 1.5;
    margin: 0;
  }

  .caju-login-pane__hint code {
    font-family: 'DM Mono', monospace;
    font-size: 0.78rem;
    color: #f0e040;
    background: #0e0e0e;
    border: 0.5px solid #1e1e1e;
    border-radius: 3px;
    padding: 1px 5px;
  }

  .caju-input {
    width: 100%;
    background: #0e0e0e;
    border: 0.5px solid #2a2a2a;
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 0.9rem;
    font-family: 'DM Mono', monospace;
    color: #f5f5f5;
    outline: none;
    transition: border-color 0.15s;
  }

  .caju-input:focus { border-color: #f0e040; }
  .caju-input::placeholder { color: #2a2a2a; }

  .caju-btn-primary {
    width: 100%;
    padding: 12px;
    border-radius: 9px;
    border: none;
    background: #f0e040;
    color: #0e0e0e;
    font-size: 0.9rem;
    font-weight: 800;
    font-family: 'Syne', sans-serif;
    cursor: pointer;
    letter-spacing: -0.02em;
    transition: all 0.15s;
  }

  .caju-btn-primary:hover:not(:disabled) { background: #ffe820; }
  .caju-btn-primary:active:not(:disabled) { transform: scale(0.985); }
  .caju-btn-primary:disabled { opacity: 0.35; cursor: default; }

  .caju-btn-secondary {
    width: 100%;
    padding: 11px;
    border-radius: 9px;
    background: transparent;
    border: 0.5px solid #2a2a2a;
    color: #ccc;
    font-size: 0.88rem;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    cursor: pointer;
    transition: all 0.15s;
  }

  .caju-btn-secondary:hover:not(:disabled) { border-color: #f0e040; color: #f0e040; }
  .caju-btn-secondary:disabled { opacity: 0.35; cursor: default; }

  .caju-btn-ghost {
    background: transparent;
    border: 0.5px solid #2a2a2a;
    border-radius: 7px;
    padding: 7px 14px;
    color: #555;
    font-size: 0.78rem;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    cursor: pointer;
    transition: all 0.12s;
  }

  .caju-btn-ghost:hover { border-color: #555; color: #aaa; }

  .caju-login-qr {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .caju-login-qr__frame {
    background: #0e0e0e;
    border: 0.5px solid #2a2a2a;
    border-radius: 10px;
    padding: 14px;
    display: flex;
  }

  .caju-login-qr__hint {
    font-size: 0.78rem;
    color: #6ee7b7;
    margin: 0;
    font-family: 'DM Mono', monospace;
  }

  .caju-login-divider {
    text-align: center;
    font-size: 0.7rem;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-family: 'DM Mono', monospace;
    position: relative;
    padding: 6px 0;
  }

  .caju-login-divider::before,
  .caju-login-divider::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 38%;
    height: 0.5px;
    background: #1e1e1e;
  }

  .caju-login-divider::before { left: 0; }
  .caju-login-divider::after { right: 0; }

  .caju-login-error {
    font-size: 0.82rem;
    color: #f87171;
    margin: 0;
    background: #1a0606;
    border: 0.5px solid #2a0a0a;
    border-radius: 7px;
    padding: 10px 12px;
  }

  .caju-login-modal__footer {
    font-size: 0.7rem;
    color: #333;
    margin: 0;
    text-align: center;
    font-family: 'DM Mono', monospace;
    border-top: 0.5px solid #1a1a1a;
    padding-top: 1rem;
  }
`
