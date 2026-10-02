import 'server-only'
import { sealData, unsealData } from 'iron-session'
import { challengeFor } from './google'

/*
 * Google sign-in for the phone app. The browser part is the website's own Google flow; what differs is how the
 * result gets back to the app. The app starts with a PKCE challenge and a return link; after Google the server
 * redirects to that link with a short-lived one-time code (never the session itself). The app then trades the code
 * plus its secret verifier for the session token over HTTPS, so another app that catches the link can't use it.
 */

const CODE_TTL = 120

/** Where the app may be sent back to: its own scheme, or Expo Go's. Anything else is refused. */
export function validAppRedirect(url: string | null | undefined): string | null {
  if (!url || url.length > 500) return null
  try {
    const u = new URL(url)
    if (!['shopora:', 'exp:', 'exps:'].includes(u.protocol) || u.username || u.password) return null
    return url
  } catch {
    return null
  }
}

export const validChallenge = (c: string | null | undefined): string | null => (c && /^[A-Za-z0-9_-]{43}$/.test(c) ? c : null)

/** Sealed with its own key (not the session key), so a code can never be passed off as a session token. */
function codeSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set to 32+ random characters')
  return `${s}:shopora-app-code`
}

type AppCode = { uid: string; v: number; ch: string }

export const sealAppCode = (c: AppCode) => sealData(c, { password: codeSecret(), ttl: CODE_TTL })

/** The user the code was issued for, only if the verifier matches the challenge the app began with. */
export async function openAppCode(sealed: string, verifier: string): Promise<{ uid: string; v: number } | null> {
  try {
    const d = await unsealData<Partial<AppCode>>(sealed, { password: codeSecret(), ttl: CODE_TTL })
    if (typeof d.uid !== 'string' || typeof d.v !== 'number' || typeof d.ch !== 'string') return null
    return challengeFor(verifier) === d.ch ? { uid: d.uid, v: d.v } : null
  } catch {
    return null
  }
}
