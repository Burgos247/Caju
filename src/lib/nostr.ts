import NDK, {
  NDKNip07Signer,
  NDKNip46Signer,
  NDKPrivateKeySigner,
  NDKUser,
} from "@nostr-dev-kit/ndk"
import { nip19 } from "nostr-tools"

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.snort.social",
]

const EXPLICIT_RELAYS: string[] = process.env.NEXT_PUBLIC_RELAYS
  ? process.env.NEXT_PUBLIC_RELAYS.split(",").map((r) => r.trim())
  : DEFAULT_RELAYS

const NOSTRCONNECT_RELAY = "wss://relay.nsec.app"
const PROFILE_FETCH_TIMEOUT_MS = 4000
const NIP07_WAIT_TIMEOUT_MS = 4000

// ─── Singleton ────────────────────────────────────────────────────────────────

declare global {
  var __ndk: NDK | undefined
}

function createNDK(): NDK {
  return new NDK({ explicitRelayUrls: EXPLICIT_RELAYS })
}

export function getNDK(): NDK {
  if (!globalThis.__ndk) globalThis.__ndk = createNDK()
  return globalThis.__ndk
}

let _connected = false

export async function connectNDK(): Promise<NDK> {
  const ndk = getNDK()
  if (_connected) return ndk
  await ndk.connect(2000)
  _connected = true
  return ndk
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoginMethod = "extension" | "nsec" | "bunker"

export interface NostrProfile {
  pubkey: string
  npub: string
  name?: string
  picture?: string
}

export interface NostrConnectSession {
  uri: string
  waitForConnection: () => Promise<NDKUser>
  cancel: () => void
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

export async function parseProfile(user: NDKUser): Promise<NostrProfile> {
  // Best-effort fetch with timeout — never blocks login on slow relays.
  try {
    await Promise.race([
      user.fetchProfile(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("profile fetch timeout")), PROFILE_FETCH_TIMEOUT_MS)
      ),
    ])
  } catch {
    // ignore — we still have pubkey + npub
  }

  return {
    pubkey: user.pubkey,
    npub: user.npub,
    name: user.profile?.displayName || user.profile?.name,
    picture: user.profile?.picture || user.profile?.image,
  }
}

export function formatPubkey(pubkey: string): string {
  try {
    const npub = nip19.npubEncode(pubkey)
    return `${npub.slice(0, 10)}…${npub.slice(-4)}`
  } catch {
    return `${pubkey.slice(0, 8)}…${pubkey.slice(-4)}`
  }
}

// ─── Login: NIP-07 (browser extension) ────────────────────────────────────────

export async function loginWithExtension(): Promise<NDKUser> {
  if (typeof window === "undefined" || !window.nostr) {
    throw new Error("No hay extensión Nostr (NIP-07) instalada")
  }

  const ndk = await connectNDK()
  const signer = new NDKNip07Signer(NIP07_WAIT_TIMEOUT_MS, ndk)
  ndk.signer = signer
  return await signer.blockUntilReady()
}

// ─── Login: nsec (private key) ────────────────────────────────────────────────

export async function loginWithNsec(nsec: string): Promise<NDKUser> {
  const trimmed = nsec.trim()
  if (!trimmed.startsWith("nsec1")) {
    throw new Error("Formato inválido: la clave debe empezar con nsec1")
  }

  let privateKeyHex: string
  try {
    const decoded = nip19.decode(trimmed)
    if (decoded.type !== "nsec") throw new Error("No es un nsec")
    const bytes = decoded.data as Uint8Array
    privateKeyHex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  } catch {
    throw new Error("nsec inválido")
  }

  const ndk = await connectNDK()
  const signer = new NDKPrivateKeySigner(privateKeyHex)
  ndk.signer = signer
  return await signer.user()
}

// ─── Login: bunker:// (NIP-46 remote signer) ──────────────────────────────────

export async function loginWithBunker(bunkerUrl: string): Promise<NDKUser> {
  const trimmed = bunkerUrl.trim()
  if (!trimmed.startsWith("bunker://")) {
    throw new Error("Formato inválido: debe empezar con bunker://")
  }

  const ndk = await connectNDK()
  const signer = NDKNip46Signer.bunker(ndk, trimmed)
  ndk.signer = signer
  return await signer.blockUntilReady()
}

// ─── Login: nostrconnect:// (QR pairing) ──────────────────────────────────────

export async function createNostrConnectSession(
  relay: string = NOSTRCONNECT_RELAY
): Promise<NostrConnectSession> {
  const ndk = await connectNDK()
  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://caju.app"
  const signer = NDKNip46Signer.nostrconnect(ndk, relay, undefined, {
    name: "cajú",
    url: appUrl,
  })

  const uri = signer.nostrConnectUri ?? ""

  return {
    uri,
    waitForConnection: async () => {
      const user = await signer.blockUntilReadyNostrConnect()
      ndk.signer = signer
      return user
    },
    cancel: () => {
      signer.stop()
    },
  }
}
