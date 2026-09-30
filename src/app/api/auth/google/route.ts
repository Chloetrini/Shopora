import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/safe-next'
import { siteUrl } from '@/lib/site-url'
import { googleAuthUrl, googleConfigured, newPkce, newState } from '@/server/google'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'
import { cookieOptions, OAUTH_COOKIE, OAUTH_MAX_AGE, sealOAuth } from '@/server/session'

// Full-page browser navigation, so every failure redirects to /login instead of showing raw JSON.
export async function GET(req: NextRequest) {
  const back = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, siteUrl()))
  try {
    if (!googleConfigured()) return back('google_unavailable')
    if (!allow(`google:${clientIp(req)}`, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs)) return back('too_many_attempts')
    const { verifier, challenge } = newPkce()
    const state = newState()
    const next = safeNextPath(req.nextUrl.searchParams.get('next'))
    const res = NextResponse.redirect(googleAuthUrl(state, challenge))
    res.cookies.set(OAUTH_COOKIE, await sealOAuth({ state, verifier, next }), { ...cookieOptions(OAUTH_MAX_AGE), path: '/api/auth/google' })
    return res
  } catch (e) {
    console.error('google start failed', e instanceof Error ? e.message : e)
    return back('google_failed')
  }
}
