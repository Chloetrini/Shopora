import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { sendVerification } from '@/server/account-email'
import { findUserByEmail } from '@/server/db/users'
import { ok, parseJson, tooMany } from '@/server/http'
import { allow, clientIp } from '@/server/rate-limit'

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254) }).strict()
const ANSWER = 'If that email has an account waiting to be confirmed, we’ve sent a new link.'

/**
 * Not signed in (they can't be until they confirm), so the answer is identical for every address and the sending is limited
 * per IP and per address. Only an account that is still unconfirmed and has a password gets an email.
 */
export async function POST(req: NextRequest) {
  if (!allow(`resend:${clientIp(req)}`, 5, 15 * 60 * 1000)) return tooMany()
  const parsed = await parseJson(req, bodySchema)
  if ('res' in parsed) return parsed.res
  const { email } = parsed.data
  if (allow(`resend-to:${email}`, 3, 15 * 60 * 1000)) {
    const user = await findUserByEmail(email)
    if (user && !user.emailVerified && user.passwordHash) await sendVerification(user)
  }
  return ok(ANSWER)
}
