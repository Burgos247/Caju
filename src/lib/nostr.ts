import NDK, { NDKPrivateKeySigner, NDKNip07Signer } from "@nostr-dev-kit/ndk"

// Relays por defecto — el host puede agregar los suyos vía env
const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.snort.social",
]

const EXPLICIT_RELAYS: string[] = process.env.NEXT_PUBLIC_RELAYS
  ? process.env.NEXT_PUBLIC_RELAYS.split(",").map((r) => r.trim())
  : DEFAULT_RELAYS

// ─── Singleton ────────────────────────────────────────────────────────────────
// NDK se instancia una sola vez y se reutiliza en toda la app.
// En Next.js con HMR guardamos la instancia en globalThis para evitar
// reconexiones en cada hot-reload durante desarrollo.

declare global {
  // eslint-disable-next-line no-var
  var __ndk: NDK | undefined
}

function createNDK(): NDK {
  return new NDK({
    explicitRelayUrls: EXPLICIT_RELAYS,
    // Sin caché por ahora — lo agregamos en v2 con NDKCacheAdapterDexie
  })
}

export function getNDK(): NDK {
  if (!globalThis.__ndk) {
    globalThis.__ndk = createNDK()
  }
  return globalThis.__ndk
}

// ─── Conexión ─────────────────────────────────────────────────────────────────

let _connected = false

export async function connectNDK(): Promise<NDK> {
  const ndk = getNDK()
  if (_connected) return ndk

  await ndk.connect(2000) // timeout 2s por relay
  _connected = true
  return ndk
}

// ─── Signers ─────────────────────────────────────────────────────────────────
// Cajú soporta dos modos:
//   1. NIP-07 (extensión de browser: Alby, nos2x, Nostore)  ← preferido
//   2. Clave privada efímera generada al vuelo               ← fallback para jugadores sin extensión

export async function getOrCreateSigner(): Promise<NDKPrivateKeySigner | NDKNip07Signer> {
  const ndk = getNDK()

  // Intentar NIP-07 primero
  if (typeof window !== "undefined" && (window as Window & { nostr?: unknown }).nostr) {
    try {
      const signer = new NDKNip07Signer()
      await signer.user() // fuerza el prompt de la extensión ahora
      ndk.signer = signer
      return signer
    } catch {
      // El usuario rechazó el prompt — caemos al fallback
      console.warn("[cajú] NIP-07 rechazado, usando clave efímera")
    }
  }

  // Fallback: clave efímera guardada en sessionStorage
  // (se pierde al cerrar la pestaña — intencional para jugadores anónimos)
  const stored = sessionStorage.getItem("caju:ephemeral_sk")
  const signer = stored
    ? new NDKPrivateKeySigner(stored)
    : NDKPrivateKeySigner.generate()

  if (!stored) {
    sessionStorage.setItem("caju:ephemeral_sk", (signer as NDKPrivateKeySigner).privateKey!)
  }

  ndk.signer = signer
  return signer
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function relayList(): string[] {
  return EXPLICIT_RELAYS
}
