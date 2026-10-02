import type { NextRequest } from 'next/server'
import { forgotPasswordSchema } from '@/lib/validation'
import { sendReset } from '@/server/account-email'
import { findUserByEmail } from '@/server/db/users'
import { ok, parseJson, tooMany } from '@/server/http'
import { allow, clientIp } from '@/server/rate-limit'

const ANSWER = 'If an account uses that email, we’ve sent a link to choose a new password.'

/**
 * The answer is identical whether or not the account exists (and whether or not the email went out), so this can't be
 * used to find out who has an account. Limited per address and per IP so it can't be used to flood someone's inbox.
 */
export async function POST(req: NextRequest) {
  if (!allow(`forgot:${clientIp(req)}`, 5, 15 * 60 * 1000)) return tooMany()
  const parsed = await parseJson(req, forgotPasswordSchema)
  if ('res' in parsed) return parsed.res
  const { email } = parsed.data
  if (allow(`forgot-to:${email}`, 3, 15 * 60 * 1000)) {
    const user = await findUserByEmail(email)
    if (user) await sendReset(user)
  }
  return ok(ANSWER)
}
