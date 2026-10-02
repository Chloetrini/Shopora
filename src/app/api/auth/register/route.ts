import type { NextRequest } from 'next/server'
import { sendVerification } from '@/server/account-email'
import { registerSchema } from '@/lib/validation'
import { createUser, EmailTakenError, findUserByEmail, reclaimUnverified } from '@/server/db/users'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { hashPassword } from '@/server/password'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'

export async function POST(req: NextRequest) {
  if (!allow(`auth:${clientIp(req)}`, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs)) return tooMany()
  const parsed = await parseJson(req, registerSchema)
  if ('res' in parsed) return parsed.res
  const { fullName, email, password } = parsed.data
  const taken = () => fail('An account with this email already exists. Log in instead.', 409, { code: 'email_taken', details: [{ path: 'email', message: 'This email already has an account' }] })
  try {
    const passwordHash = await hashPassword(password)
    let user
    if (await findUserByEmail(email)) {
      // An account that never confirmed its address is taken over by the new sign-up (its owner never proved the address);
      // a confirmed one, or one linked to Google, is never touched.
      user = await reclaimUnverified(email, fullName, passwordHash)
      if (!user) return taken()
    } else {
      user = await createUser({ email, fullName, passwordHash, googleId: null, emailVerified: false })
    }
    // No session: the person logs in once they have confirmed the address (the link in this email also signs them in).
    const verificationSent = await sendVerification(user)
    return ok('Check your email to finish creating your account', { email: user.email, verificationSent }, 201)
  } catch (e) {
    if (e instanceof EmailTakenError) return taken() // two people registering at the same instant
    console.error('register failed', e)
    return fail('Could not create the account. Try again.', 500)
  }
}
