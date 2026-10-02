import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { openAppCode } from '@/server/app-auth'
import { findUserById, toPublicUser } from '@/server/db/users'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { allow, AUTH_LIMIT, clientIp } from '@/server/rate-limit'
import { sealSession } from '@/server/session'

const bodySchema = z.object({ code: z.string().min(10).max(2000), verifier: z.string().min(20).max(200) }).strict()

/** The phone app trades the one-time code from the Google redirect, plus its secret verifier, for a session token. */
export async function POST(req: NextRequest) {
  if (!allow(`google-app:${clientIp(req)}`, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs)) return tooMany()
  const parsed = await parseJson(req, bodySchema)
  if ('res' in parsed) return parsed.res
  const opened = await openAppCode(parsed.data.code, parsed.data.verifier)
  const user = opened ? await findUserById(opened.uid) : null
  // One answer for a wrong code, a wrong verifier, an expired code and a session that was since invalidated.
  if (!opened || !user || user.sessionVersion !== opened.v) return fail('That sign-in didn’t work. Try again.', 401)
  return ok('Logged in', { user: toPublicUser(user), token: await sealSession({ uid: user.id, v: user.sessionVersion }) })
}
