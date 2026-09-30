import { ok } from '@/server/http'
import { SESSION_COOKIE } from '@/server/session'

// Bare handler: logging out needs no database.
export async function POST() {
  const res = ok('Logged out')
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
