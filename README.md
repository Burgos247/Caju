# cajú ⚡

Quizzes en tiempo real sobre Nostr. Sin backend, sin base de datos — cada pregunta y respuesta es un evento firmado.

## Stack

- **Next.js 15** (App Router, Turbopack)
- **TypeScript**
- **NDK** — Nostr Dev Kit para publicar/suscribirse a eventos
- **Zustand** — estado global del juego
- **Syne + DM Mono** — tipografía

## Event kinds

| Kind  | Nombre   | Quién publica | Descripción |
|-------|----------|---------------|-------------|
| 30000 | SESSION  | Host          | Crea/actualiza la sesión (status: lobby → finished) |
| 30001 | QUESTION | Host          | Publica cada pregunta cuando la activa |
| 30002 | ANSWER   | Jugador       | Respuesta firmada con timestamp del cliente |

El leaderboard se calcula on-client: `score = 1000 + 500 × (1 - elapsed/window)`.

## Estructura

```
src/
  app/
    page.tsx              ← landing / entrada de código
    host/page.tsx         ← crear y controlar el quiz (4 fases)
    join/[id]/page.tsx    ← lobby del jugador
    play/[id]/page.tsx    ← pregunta en vivo
    results/[id]/page.tsx ← leaderboard final
  lib/
    nostr.ts              ← NDK singleton, signers NIP-07 / efímero
    events.ts             ← publish/subscribe/parse helpers
    hooks.ts              ← useHostSession, usePlayerSession, useNostrIdentity
    env.ts                ← documentación de vars de entorno
  store/
    gameStore.ts          ← Zustand store con selectors
  types/
    nostr.ts              ← tipos de eventos y estado
```

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno (opcional — hay defaults)
cp .env.example .env.local

# 3. Dev server
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Flujo de juego

1. **Host** entra a `/host`, crea preguntas, publica la sesión en Nostr
2. **Jugadores** entran a `/join/[sessionId]` — se identifican con NIP-07 (Alby, nos2x) o con una clave efímera generada automáticamente
3. **Host** clickea "empezar juego" → publica `kind:30001` con la primera pregunta
4. Todos los clientes reciben el evento y muestran la pregunta + timer local
5. **Jugadores** responden → cada respuesta es un `kind:30002` firmado con `answered_at` timestamp
6. **Host** avanza manualmente entre preguntas, ve el leaderboard en vivo
7. Al finalizar, host publica `kind:30000` con `status: finished` → todos ven resultados

## Roadmap v2 — prize pool de sats

- [ ] NWC (Nostr Wallet Connect) para el host
- [ ] Cada jugador zapea X sats al entrar via LNURL
- [ ] DVM actúa como árbitro: verifica respuestas on-chain de eventos Nostr
- [ ] Pago automático al ganador via Lightning
- [ ] Draft de NIP para `kind:30000-30002` con semántica estándar

## Identidad de jugadores

Los jugadores pueden usar:
- **NIP-07** (extensión de browser: Alby, nos2x, Nostore) — identidad real Nostr
- **Clave efímera** — generada al vuelo, guardada en `sessionStorage`, anónima

Las respuestas siempre van firmadas — el leaderboard es verificable por cualquiera con acceso al relay.
