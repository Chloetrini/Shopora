import 'server-only'
import { sealData, unsealData } from 'iron-session'

/** An encrypted, signed, httpOnly cookie holding only `{ uid, v }` (user id and session version). */
export const SESSION_COOKIE = 'shopora_session'
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60

export type Session = { uid: string; v: number }

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set to 32+ random characters (openssl rand -base64 32)')
  return s
}

export const sealSession = async (s: Session) => sealData(s, { password: secret(), ttl: SESSION_MAX_AGE })

/** Null for a missing, forged, expired or old-secret cookie. */
export async function unsealSession(sealed: string | undefined): Promise<Session | null> {
  if (!sealed) return null
  try {
    const d = await unsealData<Partial<Session>>(sealed, { password: secret(), ttl: SESSION_MAX_AGE })
    return typeof d.uid === 'string' && typeof d.v === 'number' ? { uid: d.uid, v: d.v } : null
  } catch {
    return null
  }
}

/** The phone app says so with this header; it then also gets the session as a token in the body (the web never does). */
export const CLIENT_HEADER = 'x-shopora-client'
export const isMobileClient = (req: Request) => req.headers.get(CLIENT_HEADER) === 'mobile'

/** A 2-minute, readable cookie carrying the first name, so the next page can say "Welcome to Shopora, <name>!" once. */
export const WELCOME_COOKIE = 'shopora_welcome'
export const welcomeCookie = (fullName: string) => ({
  name: WELCOME_COOKIE,
  value: encodeURIComponent(fullName.trim().split(/\s+/)[0]?.slice(0, 40) || 'there'),
  options: { path: '/', maxAge: 120, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' },
})

export const cookieOptions = (maxAge = SESSION_MAX_AGE) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Google returns with a top-level GET, so 'strict' would drop the OAuth cookie
  path: '/',
  maxAge,
})

/** Short-lived cookie carrying state, PKCE verifier and `next` across the Google round trip. */
export const OAUTH_COOKIE = 'shopora_oauth'
export const OAUTH_MAX_AGE = 10 * 60
/** `app` is set when the phone app started the sign-in: where to send the person back, and the app's PKCE challenge. */
export type OAuthState = { state: string; verifier: string; next: string; app?: { redirect: string; challenge: string } }

export const sealOAuth = async (d: OAuthState) => sealData(d, { password: secret(), ttl: OAUTH_MAX_AGE })

export async function unsealOAuth(sealed: string | undefined): Promise<OAuthState | null> {
  if (!sealed) return null
  try {
    const d = await unsealData<Partial<OAuthState>>(sealed, { password: secret(), ttl: OAUTH_MAX_AGE })
    return typeof d.state === 'string' && typeof d.verifier === 'string' && typeof d.next === 'string'
      ? { state: d.state, verifier: d.verifier, next: d.next, app: d.app && typeof d.app.redirect === 'string' && typeof d.app.challenge === 'string' ? d.app : undefined }
      : null
  } catch {
    return null
  }
}
