// NIP-07: window.nostr provided by browser extensions (Alby, nos2x, Nostore…)
// Declared globally so we can read window.nostr without inline `as` casts.

interface Nip07RelayEntry {
  read: boolean
  write: boolean
}

interface Nip07Event {
  id?: string
  pubkey?: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig?: string
}

interface Nip07Nip04 {
  encrypt(pubkey: string, plaintext: string): Promise<string>
  decrypt(pubkey: string, ciphertext: string): Promise<string>
}

interface Nip07Nip44 {
  encrypt(pubkey: string, plaintext: string): Promise<string>
  decrypt(pubkey: string, ciphertext: string): Promise<string>
}

interface Nip07Provider {
  getPublicKey(): Promise<string>
  signEvent(event: Nip07Event): Promise<Nip07Event>
  getRelays?(): Promise<Record<string, Nip07RelayEntry>>
  nip04?: Nip07Nip04
  nip44?: Nip07Nip44
}

declare global {
  interface Window {
    nostr?: Nip07Provider
  }
}

export {}
