import type { NextRequest } from 'next/server'
import { registerSchema } from '@/lib/validation'
import { createUser, EmailTakenError, findUserByEmail, toPublicUser } from '@/server/db/users'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { hashPassword } from '@/server/password'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'
import { cookieOptions, SESSION_COOKIE, sealSession } from '@/server/session'

export async function POST(req: NextRequest) {
  if (!allow(`auth:${clientIp(req)}`, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs)) return tooMany()
  const parsed = await parseJson(req, registerSchema)
  if ('res' in parsed) return parsed.res
  const { fullName, email, password } = parsed.data
  const taken = () => fail('An account with this email already exists. Log in instead.', 409, { code: 'email_taken', details: [{ path: 'email', message: 'This email already has an account' }] })
  try {
    if (await findUserByEmail(email)) return taken()
    const user = await createUser({ email, fullName, passwordHash: await hashPassword(password), googleId: null, emailVerified: false })
    const res = ok('Account created', { user: toPublicUser(user) }, 201)
    res.cookies.set(SESSION_COOKIE, await sealSession({ uid: user.id, v: user.sessionVersion }), cookieOptions())
    return res
  } catch (e) {
    if (e instanceof EmailTakenError) return taken() // two people registering at the same instant
    console.error('register failed', e)
    return fail('Could not create the account. Try again.', 500)
  }
}
