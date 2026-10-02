import type { NextRequest } from 'next/server'
import { tokenSchema } from '@/lib/validation'
import { sendWelcome } from '@/server/account-email'
import { consumeVerifyToken } from '@/server/db/account-tokens'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { allow, clientIp } from '@/server/rate-limit'
import { cookieOptions, isMobileClient, SESSION_COOKIE, sealSession, welcomeCookie } from '@/server/session'
import { hashToken } from '@/server/tokens'

/**
 * POST, not GET: mail scanners and link previews open links, and a GET would use the link up. The page waits for a click.
 * Opening the link proves the person controls the mailbox, so it also signs them in (cookie; plus a token for the phone app)
 * and sends the welcome email. The link works once, so the welcome is sent once.
 */
export async function POST(req: NextRequest) {
  if (!allow(`link:${clientIp(req)}`, 30, 15 * 60 * 1000)) return tooMany()
  const parsed = await parseJson(req, tokenSchema)
  if ('res' in parsed) return parsed.res
  const account = await consumeVerifyToken(hashToken(parsed.data.token))
  if (!account) return fail('This link didn’t work. It may have expired or already been used.', 400, { code: 'invalid_token' })
  await sendWelcome(account)
  const sealed = await sealSession({ uid: account.id, v: account.sessionVersion })
  const res = ok('Email confirmed', { email: account.email, fullName: account.fullName, ...(isMobileClient(req) ? { token: sealed } : {}) })
  res.cookies.set(SESSION_COOKIE, sealed, cookieOptions())
  const w = welcomeCookie(account.fullName)
  res.cookies.set(w.name, w.value, w.options)
  return res
}
