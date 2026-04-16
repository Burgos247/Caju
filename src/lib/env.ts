// Tipado de las variables de entorno de Cajú
// Agregar a .env.local en la raíz del proyecto Next.js

/**
 * NEXT_PUBLIC_RELAYS
 * Lista separada por comas de relay URLs.
 * Si no se define, se usan los relays por defecto en src/lib/nostr.ts
 *
 * Ejemplo:
 * NEXT_PUBLIC_RELAYS=wss://relay.damus.io,wss://nos.lol
 */

// Este archivo es solo documentación — no ejecuta nada.
// Next.js valida las vars en next.config.ts si querés hacerlo estricto.

export const ENV_VARS = {
  RELAYS: "NEXT_PUBLIC_RELAYS",
} as const
