import type { NextRequest } from 'next/server'
import { deleteAccountSchema, profileSchema } from '@/lib/validation'
import { deleteUser, findUserById, toPublicUser, updateProfile } from '@/server/db/users'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { verifyPassword } from '@/server/password'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'
import { requireUser } from '@/server/require-user'
import { SESSION_COOKIE } from '@/server/session'

/** Name and phone. The body is strict: nobody can set their email, admin flag or anything else through here. */
export async function PATCH(req: NextRequest) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, profileSchema)
  if ('res' in parsed) return parsed.res
  const user = await updateProfile(a.user.id, parsed.data)
  return user ? ok('Profile saved', { user: toPublicUser(user) }) : fail('Please log in first', 401)
}

/**
 * Deletes the account. Needs the password, or for a Google-only account (no password) typing the email address.
 * The cart, wishlist and saved addresses go with it; past orders stay as records of the sale.
 */
export async function DELETE(req: NextRequest) {
  if (!allow(`auth:${clientIp(req)}`, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs)) return tooMany()
  const a = await requireUser(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, deleteAccountSchema)
  if ('res' in parsed) return parsed.res
  const record = await findUserById(a.user.id)
  if (!record) return fail('Please log in first', 401)
  if (record.passwordHash) {
    if (!parsed.data.password || !(await verifyPassword(parsed.data.password, record.passwordHash))) return fail('That password isn’t right.', 400, { details: [{ path: 'password', message: 'That password isn’t right.' }] })
  } else if (parsed.data.confirmEmail !== record.email.toLowerCase()) {
    return fail('Type your email address to confirm.', 400, { details: [{ path: 'confirmEmail', message: 'Type your email address to confirm.' }] })
  }
  await deleteUser(record.id)
  const res = ok('Account deleted')
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
