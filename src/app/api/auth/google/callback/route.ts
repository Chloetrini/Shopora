import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/safe-next'
import { siteUrl } from '@/lib/site-url'
import { claimGuestOrders } from '@/server/db/orders'
import { fetchGoogleProfile, googleConfigured } from '@/server/google'
import { resolveGoogleUser } from '@/server/google-account'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'
import { cookieOptions, OAUTH_COOKIE, SESSION_COOKIE, sealSession, unsealOAuth } from '@/server/session'

export async function GET(req: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, siteUrl()))
  const back = (code: string) => {
    const res = to(`/login?error=${code}`)
    res.cookies.set(OAUTH_COOKIE, '', { path: '/api/auth/google', maxAge: 0 })
    return res
  }
  try {
    if (!googleConfigured()) return back('google_unavailable')
    if (!allow(`google:${clientIp(req)}`, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs)) return back('too_many_attempts')
    const q = req.nextUrl.searchParams
    if (q.get('error')) return back(q.get('error') === 'access_denied' ? 'google_cancelled' : 'google_failed')
    const saved = await unsealOAuth(req.cookies.get(OAUTH_COOKIE)?.value)
    const code = q.get('code')
    // The state we sent must come back unchanged and match the one in our own cookie (CSRF / login fixation).
    if (!saved || !code || !q.get('state') || q.get('state') !== saved.state) return back('google_failed')

    const profile = await fetchGoogleProfile(code, saved.verifier)
    // Only a verified Google email is trusted; otherwise someone could claim another person's address.
    if (!profile.email_verified) return back('google_unverified')

    const user = await resolveGoogleUser(profile)
    // Google verified this email, so earlier guest orders placed with it are now safely this account's.
    await claimGuestOrders(user.id, user.email).catch((e) => console.error('claimGuestOrders failed', e))
    const res = to(safeNextPath(saved.next))
    res.cookies.set(SESSION_COOKIE, await sealSession({ uid: user.id, v: user.sessionVersion }), cookieOptions())
    res.cookies.set(OAUTH_COOKIE, '', { path: '/api/auth/google', maxAge: 0 })
    return res
  } catch (e) {
    console.error('google callback failed', e instanceof Error ? e.message : e)
    return back('google_failed')
  }
}
