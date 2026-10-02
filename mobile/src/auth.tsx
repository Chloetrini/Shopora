import * as SecureStore from 'expo-secure-store'
import { AppState } from 'react-native'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError, setToken } from './api'
import { googleSignIn } from './google'
import type { User } from './types'

const KEY = 'shopora_token'

type AuthApi = {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  /** Creates the account. Nobody is signed in: the email must be confirmed first. */
  register: (fullName: string, email: string, password: string) => Promise<{ email: string; verificationSent: boolean }>
  /** `created` is true when this sign-in just made the account (the app then says welcome). */
  loginWithGoogle: () => Promise<{ created: boolean }>
  refreshUser: () => Promise<void>
  updateUser: (u: User) => void
  replaceToken: (t: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  // On start: if a token is saved and still good, the person is signed in.
  useEffect(() => {
    ;(async () => {
      try {
        const saved = await SecureStore.getItemAsync(KEY)
        if (saved) {
          setToken(saved)
          try {
            setUser((await api<{ user: User }>('/api/auth/me')).user)
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) {
              setToken(null)
              await SecureStore.deleteItemAsync(KEY)
            }
          }
        }
      } finally {
        setReady(true)
      }
    })()
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      setUser((await api<{ user: User }>('/api/auth/me')).user)
    } catch {
      /* offline, or the session ended: the next real request deals with it */
    }
  }, [])

  // Coming back to the app (say, after confirming the email in the browser) picks up the latest account state.
  const signedIn = !!user
  useEffect(() => {
    if (!signedIn) return
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void refreshUser() })
    return () => sub.remove()
  }, [signedIn, refreshUser])

  const finish = useCallback(async (body: { user: User; token?: string }) => {
    if (!body.token) throw new ApiError('Could not sign in. Try again.', 500)
    setToken(body.token)
    await SecureStore.setItemAsync(KEY, body.token)
    setUser(body.user)
  }, [])

  const value = useMemo<AuthApi>(
    () => ({
      user,
      ready,
      login: async (email, password) => finish(await api('/api/auth/login', { method: 'POST', body: { email, password } })),
      register: async (fullName, email, password) => api<{ email: string; verificationSent: boolean }>('/api/auth/register', { method: 'POST', body: { fullName, email, password } }),
      refreshUser,
      updateUser: (u) => setUser(u),
      replaceToken: async (t) => {
        setToken(t)
        await SecureStore.setItemAsync(KEY, t)
      },
      loginWithGoogle: async () => {
        const body = await api<{ user: User; token?: string; created?: boolean }>('/api/auth/google/app', { method: 'POST', body: await googleSignIn() })
        await finish(body)
        return { created: body.created === true }
      },
      logout: async () => {
        setToken(null)
        setUser(null)
        await SecureStore.deleteItemAsync(KEY).catch(() => {})
      },
    }),
    [user, ready, finish, refreshUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthApi {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}
