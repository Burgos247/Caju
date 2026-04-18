import { create } from "zustand"
import { persist } from "zustand/middleware"
import { NDKUser } from "@nostr-dev-kit/ndk"
import {
  LoginMethod,
  NostrProfile,
  parseProfile,
  loginAsGuest,
  clearGuestKey,
} from "@/lib/nostr"
import { useGameStore } from "./gameStore"

interface AuthState {
  isConnected: boolean
  isLoading: boolean
  profile: NostrProfile | null
  loginMethod: LoginMethod | null
  error: string | null
}

interface AuthActions {
  setUser: (user: NDKUser, method: LoginMethod) => Promise<void>
  setLoading: (v: boolean) => void
  setError: (msg: string | null) => void
  logout: () => void
}

const initialState: AuthState = {
  isConnected: false,
  isLoading: false,
  profile: null,
  loginMethod: null,
  error: null,
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: async (user, method) => {
        set({ isLoading: true, error: null })
        try {
          // Para invitados no fetcheamos profile — son anónimos por diseño y
          // ahorra el timeout de 4s que de todos modos no devolvería nada.
          const profile: NostrProfile =
            method === "guest"
              ? { pubkey: user.pubkey, npub: user.npub }
              : await parseProfile(user)
          set({
            isConnected: true,
            isLoading: false,
            profile,
            loginMethod: method,
            error: null,
          })
          // Mantener compat con resto de la app que lee myPubkey desde gameStore.
          useGameStore.getState().setMyPubkey(user.pubkey)
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : String(err) })
          throw err
        }
      },

      setLoading: (v) => set({ isLoading: v }),
      setError: (msg) => set({ error: msg }),

      logout: () => {
        // Si era invitado, descartar también la clave en sessionStorage.
        clearGuestKey()
        set(initialState)
        useGameStore.getState().reset()
      },
    }),
    {
      name: "caju:auth",
      // Solo persistimos lo que es seguro y serializable. Nunca el nsec.
      partialize: (s) => ({
        loginMethod: s.loginMethod,
        profile: s.profile,
      }),
      onRehydrateStorage: () => (state) => {
        // Al rehidratar: si el método persistido es "guest" intentamos
        // re-attach al signer desde sessionStorage. Si la sesión del browser
        // se cerró y la key no está, limpiamos la auth para forzar re-login.
        if (state?.loginMethod === "guest" && state.profile) {
          loginAsGuest()
            .then((user) => {
              useGameStore.getState().setMyPubkey(user.pubkey)
              useAuthStore.setState({ isConnected: true })
            })
            .catch(() => {
              useAuthStore.setState({ ...initialState })
            })
        } else if (state?.loginMethod && state.profile) {
          // Para extension/nsec/bunker: marcamos hidratado pero el signer no
          // está vivo aún. Las pages que requieren signer mostrarán LoginGate
          // si el flujo lo necesita. (Por ahora dejamos isConnected en false
          // porque no podemos firmar sin re-pegar nsec / re-aprobar extensión.)
        }
      },
    }
  )
)
