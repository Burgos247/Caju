"use client"

import { useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import {
  loginWithExtension,
  loginWithNsec,
  loginWithBunker,
  loginAsGuest,
  createNostrConnectSession,
  type LoginMethod,
  type NostrConnectSession,
} from "@/lib/nostr"
import { useAuthStore } from "@/store/authStore"

type Tab = "extension" | "nsec" | "bunker"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  // Cuando true, oculta el × y desactiva click-en-overlay para cerrar.
  // Útil cuando el modal es la única pantalla posible (ej. login obligatorio).
  blocking?: boolean
}

export function LoginModal({ isOpen, onClose, blocking = false }: LoginModalProps) {
  const setUser = useAuthStore((s) => s.setUser)
  const lastMethod = useAuthStore((s) => s.loginMethod)

  const hasExtension = typeof window !== "undefined" && !!window.nostr
  const defaultTab: Tab =
    (lastMethod as Tab | null) ?? (hasExtension ? "extension" : "nsec")

  const [tab, setTab] = useState<Tab>(defaultTab)
  const [busy, setBusy] = useState<LoginMethod | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [nsec, setNsec] = useState("")
  const [bunkerUrl, setBunkerUrl] = useState("")

  const [qrSession, setQrSession] = useState<NostrConnectSession | null>(null)
  // Una vez paireado, NO cancelamos el signer en cleanup — sigue activo para firmar.
  const qrPairedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setBusy(null)
  }, [isOpen])

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

  const onGuest = () =>
    handle("guest", async () => ({ user: await loginAsGuest() }))

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

  const handleOverlayClick = () => {
    if (!blocking) onClose()
  }

  return (
    <div className="caju-login-overlay" onClick={handleOverlayClick}>
      <div className="caju-login-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="caju-login-modal__header">
          <span className="caju-login-modal__logo">cajú</span>
          {!blocking && (
            <button
              className="caju-login-modal__close"
              onClick={onClose}
              aria-label="cerrar"
            >
              ×
            </button>
          )}
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
                className="caju-login-btn-primary"
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
                className="caju-login-input"
                type="password"
                placeholder="nsec1…"
                value={nsec}
                onChange={(e) => setNsec(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="caju-login-btn-primary"
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
                  className="caju-login-btn-secondary"
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
                    className="caju-login-btn-ghost"
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
                className="caju-login-input"
                type="text"
                placeholder="bunker://npub…@relay.nsec.app?secret=…"
                value={bunkerUrl}
                onChange={(e) => setBunkerUrl(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="caju-login-btn-primary"
                onClick={onBunker}
                disabled={!bunkerUrl.trim() || busy !== null}
              >
                {busy === "bunker" && !qrSession ? "conectando…" : "conectar bunker"}
              </button>
            </div>
          )}
        </div>

        {error && <p className="caju-login-error">{error}</p>}

        <div className="caju-login-guest">
          <button
            className="caju-login-guest__btn"
            onClick={onGuest}
            disabled={busy !== null}
          >
            {busy === "guest" ? "creando identidad…" : "entrar como invitado"}
          </button>
          <p className="caju-login-guest__hint">
            generamos una clave efímera en este dispositivo · se borra al cerrar la pestaña
          </p>
        </div>

        <p className="caju-login-modal__footer">
          ⚡ identidad on-relay · sin servidores
        </p>
      </div>

      <style>{loginStyles}</style>
    </div>
  )
}

const loginStyles = `
  .caju-login-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    padding-bottom: calc(1.25rem + var(--safe-bottom));
    padding-top: calc(1.25rem + var(--safe-top));
    z-index: 1000;
    font-family: var(--font-display);
  }

  .caju-login-modal {
    width: 100%;
    max-width: 420px;
    max-height: 100%;
    overflow-y: auto;
    background: var(--bg-card);
    border: 0.5px solid var(--border-3);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    color: var(--fg-6);
  }

  .caju-login-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
  }

  .caju-login-modal__logo {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    color: var(--accent);
  }

  .caju-login-modal__close {
    width: 44px;
    height: 44px;
    background: transparent;
    border: none;
    color: var(--fg-3);
    font-size: 1.8rem;
    line-height: 1;
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.12s, background 0.12s;
  }

  .caju-login-modal__close:hover {
    color: var(--fg-5);
    background: var(--bg-elev);
  }

  .caju-login-modal__title {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    margin: 0;
    line-height: 1.1;
  }

  .caju-login-modal__sub {
    font-size: 0.85rem;
    color: var(--fg-4);
    margin: -0.6rem 0 0;
  }

  .caju-login-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    background: var(--bg);
    border: 0.5px solid var(--border-2);
    border-radius: var(--radius);
    padding: 4px;
  }

  .caju-login-tab {
    padding: 10px 6px;
    border-radius: 5px;
    background: transparent;
    border: none;
    color: var(--fg-3);
    font-size: 0.78rem;
    font-weight: 700;
    font-family: var(--font-display);
    cursor: pointer;
    text-transform: lowercase;
    letter-spacing: 0.02em;
    transition: all 0.12s;
  }

  .caju-login-tab:hover:not(:disabled) { color: var(--fg-5); }
  .caju-login-tab:disabled { opacity: 0.35; cursor: not-allowed; }

  .caju-login-tab--active {
    background: var(--accent-soft-bg);
    color: var(--accent);
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
    color: var(--fg-4);
    line-height: 1.5;
    margin: 0;
  }

  .caju-login-pane__hint code {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--accent);
    background: var(--bg);
    border: 0.5px solid var(--border-2);
    border-radius: 3px;
    padding: 1px 5px;
  }

  .caju-login-input {
    width: 100%;
    background: var(--bg);
    border: 0.5px solid var(--border-3);
    border-radius: var(--radius);
    padding: 12px 14px;
    font-size: 0.9rem;
    font-family: var(--font-mono);
    color: var(--fg-6);
    outline: none;
    transition: border-color 0.15s;
    min-height: 44px;
  }

  .caju-login-input:focus { border-color: var(--accent); }
  .caju-login-input::placeholder { color: var(--fg-1); }

  .caju-login-btn-primary {
    width: 100%;
    padding: 14px;
    border-radius: 9px;
    border: none;
    background: var(--accent);
    color: var(--bg);
    font-size: 0.9rem;
    font-weight: 800;
    font-family: var(--font-display);
    cursor: pointer;
    letter-spacing: -0.02em;
    transition: all 0.15s;
    min-height: 44px;
  }

  .caju-login-btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
  .caju-login-btn-primary:active:not(:disabled) { transform: scale(0.985); }
  .caju-login-btn-primary:disabled { opacity: 0.35; cursor: default; }

  .caju-login-btn-secondary {
    width: 100%;
    padding: 12px;
    border-radius: 9px;
    background: transparent;
    border: 0.5px solid var(--border-3);
    color: var(--fg-5);
    font-size: 0.88rem;
    font-weight: 700;
    font-family: var(--font-display);
    cursor: pointer;
    transition: all 0.15s;
    min-height: 44px;
  }

  .caju-login-btn-secondary:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .caju-login-btn-secondary:disabled { opacity: 0.35; cursor: default; }

  .caju-login-btn-ghost {
    background: transparent;
    border: 0.5px solid var(--border-3);
    border-radius: 7px;
    padding: 8px 16px;
    color: var(--fg-3);
    font-size: 0.78rem;
    font-weight: 700;
    font-family: var(--font-display);
    cursor: pointer;
    transition: all 0.12s;
  }

  .caju-login-btn-ghost:hover { border-color: var(--fg-3); color: var(--fg-5); }

  .caju-login-qr {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .caju-login-qr__frame {
    background: var(--bg);
    border: 0.5px solid var(--border-3);
    border-radius: var(--radius-lg);
    padding: 14px;
    display: flex;
  }

  .caju-login-qr__hint {
    font-size: 0.78rem;
    color: var(--success);
    margin: 0;
    font-family: var(--font-mono);
  }

  .caju-login-divider {
    text-align: center;
    font-size: 0.7rem;
    color: var(--fg-2);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-family: var(--font-mono);
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
    background: var(--border-2);
  }

  .caju-login-divider::before { left: 0; }
  .caju-login-divider::after { right: 0; }

  .caju-login-error {
    font-size: 0.82rem;
    color: var(--danger);
    margin: 0;
    background: var(--danger-bg);
    border: 0.5px solid #2a0a0a;
    border-radius: 7px;
    padding: 10px 12px;
  }

  .caju-login-modal__footer {
    font-size: 0.7rem;
    color: var(--fg-2);
    margin: 0;
    text-align: center;
    font-family: var(--font-mono);
    border-top: 0.5px solid var(--border-1);
    padding-top: 1rem;
  }

  .caju-login-guest {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    border-top: 0.5px solid var(--border-1);
    padding-top: 1rem;
  }

  .caju-login-guest__btn {
    background: transparent;
    border: none;
    color: var(--fg-4);
    font-size: 0.8rem;
    font-weight: 700;
    font-family: var(--font-display);
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: var(--fg-2);
    text-underline-offset: 3px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    transition: color 0.12s;
  }

  .caju-login-guest__btn:hover:not(:disabled) {
    color: var(--accent);
    text-decoration-color: var(--accent);
  }
  .caju-login-guest__btn:disabled { opacity: 0.4; cursor: default; }

  .caju-login-guest__hint {
    font-size: 0.68rem;
    color: var(--fg-2);
    margin: 0;
    text-align: center;
    line-height: 1.4;
    max-width: 280px;
    font-family: var(--font-mono);
  }
`
