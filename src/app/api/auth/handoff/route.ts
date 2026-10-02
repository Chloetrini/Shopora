import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/safe-next'
import { siteUrl } from '@/lib/site-url'
import { openHandoff, sealHandoff } from '@/server/app-auth'
import { getRequestUser } from '@/server/current-user'
import { findUserById } from '@/server/db/users'
import { fail, ok, tooMany } from '@/server/http'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'
import { cookieOptions, SESSION_COOKIE, sealSession } from '@/server/session'

/** Step 1, from the app (bearer token): a code that lasts 60 seconds. */
export async function POST(req: NextRequest) {
  if (!allow(`handoff:${clientIp(req)}`, AUTH_LIMIT.limit * 3, AUTH_LIMIT.windowMs)) return tooMany()
  const user = await getRequestUser(req)
  if (!user) return fail('Please log in first', 401)
  const found = await findUserById(user.id)
  if (!found) return fail('Please log in first', 401)
  return ok('Hand-off ready', { code: await sealHandoff({ uid: found.id, v: found.sessionVersion }) })
}

/** Step 2, in the browser the app opens: sets the session cookie, then goes on to a page on the site. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const to = (path: string) => NextResponse.redirect(new URL(path, siteUrl()))
  if (!allow(`handoff:${clientIp(req)}`, AUTH_LIMIT.limit * 3, AUTH_LIMIT.windowMs)) return to('/login?error=too_many_attempts')
  const opened = await openHandoff(q.get('code'))
  const user = opened ? await findUserById(opened.uid) : null
  if (!opened || !user || user.sessionVersion !== opened.v) return to('/login')
  const res = to(safeNextPath(q.get('next')))
  res.cookies.set(SESSION_COOKIE, await sealSession({ uid: user.id, v: user.sessionVersion }), cookieOptions())
  return res
}
