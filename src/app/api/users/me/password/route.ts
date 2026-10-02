import type { NextRequest } from 'next/server'
import { passwordChangeSchema } from '@/lib/validation'
import { changePassword, findUserById } from '@/server/db/users'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { hashPassword, verifyPassword } from '@/server/password'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'
import { requireUser } from '@/server/require-user'
import { cookieOptions, isMobileClient, SESSION_COOKIE, sealSession } from '@/server/session'

/**
 * Change the password (needs the current one) or, for a Google-only account that has none, set one.
 * Every other device is signed out (session_version + 1); this one gets a fresh cookie, and the phone app a fresh token.
 */
export async function PATCH(req: NextRequest) {
  if (!allow(`auth:${clientIp(req)}`, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs)) return tooMany()
  const a = await requireUser(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, passwordChangeSchema)
  if ('res' in parsed) return parsed.res
  const record = await findUserById(a.user.id)
  if (!record) return fail('Please log in first', 401)
  const hadPassword = !!record.passwordHash
  if (hadPassword && (!parsed.data.currentPassword || !(await verifyPassword(parsed.data.currentPassword, record.passwordHash)))) {
    return fail('Your current password isn’t right.', 400, { details: [{ path: 'currentPassword', message: 'Your current password isn’t right.' }] })
  }
  const version = await changePassword(record.id, await hashPassword(parsed.data.newPassword))
  const sealed = await sealSession({ uid: record.id, v: version })
  const res = ok(hadPassword ? 'Password changed' : 'Password set', isMobileClient(req) ? { token: sealed } : undefined)
  res.cookies.set(SESSION_COOKIE, sealed, cookieOptions())
  return res
}
