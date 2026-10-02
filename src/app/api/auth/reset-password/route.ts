import type { NextRequest } from 'next/server'
import { resetPasswordSchema } from '@/lib/validation'
import { consumeResetToken } from '@/server/db/account-tokens'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { hashPassword } from '@/server/password'
import { allow, clientIp } from '@/server/rate-limit'
import { hashToken } from '@/server/tokens'

/**
 * The new password is checked by the schema BEFORE the link is looked at, so a weak password doesn't use the link up.
 * A reset signs the account out everywhere, doesn't sign this device in, and counts as proof of the address.
 */
export async function POST(req: NextRequest) {
  if (!allow(`link:${clientIp(req)}`, 30, 15 * 60 * 1000)) return tooMany()
  const parsed = await parseJson(req, resetPasswordSchema)
  if ('res' in parsed) return parsed.res
  const email = await consumeResetToken(hashToken(parsed.data.token), await hashPassword(parsed.data.newPassword))
  if (!email) return fail('This link didn’t work. It may have expired or already been used.', 400, { code: 'invalid_token' })
  return ok('Password changed. You can log in now.')
}
