import type { NextRequest } from 'next/server'
import { tokenSchema } from '@/lib/validation'
import { consumeVerifyToken } from '@/server/db/account-tokens'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { allow, clientIp } from '@/server/rate-limit'
import { hashToken } from '@/server/tokens'

/** POST, not GET: mail scanners and link previews open links, and a GET would use the link up. The page waits for a click. */
export async function POST(req: NextRequest) {
  if (!allow(`link:${clientIp(req)}`, 30, 15 * 60 * 1000)) return tooMany()
  const parsed = await parseJson(req, tokenSchema)
  if ('res' in parsed) return parsed.res
  const email = await consumeVerifyToken(hashToken(parsed.data.token))
  if (!email) return fail('This link didn’t work. It may have expired or already been used.', 400, { code: 'invalid_token' })
  return ok('Email confirmed', { email })
}
