import type { NextRequest } from 'next/server'
import { getRequestUser } from '@/server/current-user'
import { fail, ok } from '@/server/http'
import { SESSION_COOKIE } from '@/server/session'

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user) {
    const res = fail('Not signed in', 401)
    if (req.cookies.has(SESSION_COOKIE)) res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 }) // stale cookie
    return res
  }
  return ok('Signed in', { user })
}
