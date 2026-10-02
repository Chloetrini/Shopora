import type { NextRequest } from 'next/server'
import { loginSchema } from '@/lib/validation'
import { findUserByEmail, toPublicUser } from '@/server/db/users'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { verifyPassword } from '@/server/password'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'
import { cookieOptions, isMobileClient, SESSION_COOKIE, sealSession } from '@/server/session'

export async function POST(req: NextRequest) {
  if (!allow(`auth:${clientIp(req)}`, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs)) return tooMany()
  const parsed = await parseJson(req, loginSchema)
  if ('res' in parsed) return parsed.res
  try {
    const user = await findUserByEmail(parsed.data.email)
    // One generic error for "no such account", "wrong password" and "Google-only account".
    const good = await verifyPassword(parsed.data.password, user?.passwordHash ?? null)
    if (!user || !good) return fail('Wrong email or password', 401)
    const sealed = await sealSession({ uid: user.id, v: user.sessionVersion })
    const res = ok('Logged in', { user: toPublicUser(user), ...(isMobileClient(req) ? { token: sealed } : {}) })
    res.cookies.set(SESSION_COOKIE, sealed, cookieOptions())
    return res
  } catch (e) {
    console.error('login failed', e)
    return fail('Could not log in. Try again.', 500)
  }
}
