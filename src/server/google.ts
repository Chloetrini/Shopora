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
