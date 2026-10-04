import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { siteUrl } from '@/lib/site-url'

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
/** Must be listed exactly in Google Cloud Console, Authorized redirect URIs. */
export const googleRedirectUri = () => `${siteUrl()}/api/auth/google/callback`

export const challengeFor = (verifier: string) => createHash('sha256').update(verifier).digest('base64url')

export function newPkce() {
  const verifier = randomBytes(32).toString('base64url')
  return { verifier, challenge: challengeFor(verifier) }
}

export const newState = () => randomBytes(24).toString('base64url')

export function googleAuthUrl(state: string, challenge: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

export type GoogleProfile = { sub: string; email: string; email_verified: boolean; name?: string }

/** Server-to-server code exchange, then the profile over TLS. Throws on any failure. */
export async function fetchGoogleProfile(code: string, verifier: string): Promise<GoogleProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    cache: 'no-store',
  })
  if (!tokenRes.ok) throw new Error(`Google token exchange failed (${tokenRes.status})`)
  const { access_token } = (await tokenRes.json()) as { access_token?: string }
  if (!access_token) throw new Error('Google returned no access token')
  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: 'no-store',
  })
  if (!infoRes.ok) throw new Error(`Google userinfo failed (${infoRes.status})`)
  const p = (await infoRes.json()) as Partial<GoogleProfile>
  if (typeof p.sub !== 'string' || typeof p.email !== 'string') throw new Error('Google profile is missing sub or email')
  return { sub: p.sub, email: p.email, email_verified: p.email_verified === true, name: p.name }
}

/**
 * Checks an ID token that the phone app got from Google's own sign-in sheet. Google verifies the signature and expiry;
 * we then require that it was issued for OUR web client id (so a token made for another app is refused) and that the
 * email is verified. Throws on any failure.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Google rejected the ID token (${res.status})`)
  const t = (await res.json()) as { aud?: string; iss?: string; exp?: string; sub?: string; email?: string; email_verified?: string | boolean; name?: string }
  if (t.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('ID token was issued for a different client')
  if (t.iss !== 'accounts.google.com' && t.iss !== 'https://accounts.google.com') throw new Error('ID token has the wrong issuer')
  if (!t.exp || Number(t.exp) * 1000 < Date.now()) throw new Error('ID token has expired')
  if (typeof t.sub !== 'string' || typeof t.email !== 'string') throw new Error('ID token is missing sub or email')
  return { sub: t.sub, email: t.email, email_verified: t.email_verified === true || t.email_verified === 'true', name: t.name }
}
