import type { NextRequest } from 'next/server'
import { sendVerification } from '@/server/account-email'
import { fail, ok } from '@/server/http'
import { allow } from '@/server/rate-limit'
import { requireUser } from '@/server/require-user'

/** For a signed-in person whose email isn't confirmed yet (the banner's Resend button). */
export async function POST(req: NextRequest) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  if (a.user.emailVerified) return ok('Your email is already confirmed')
  if (!allow(`verify-mail:${a.user.id}`, 3, 15 * 60 * 1000)) return fail('Too many emails. Try again in a few minutes.', 429)
  const sent = await sendVerification(a.user)
  return sent ? ok('We’ve sent a new link to your email') : fail('We couldn’t send the email right now. Try again in a few minutes.', 502)
}
