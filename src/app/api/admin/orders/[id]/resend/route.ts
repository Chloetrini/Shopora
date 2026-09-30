import type { NextRequest } from 'next/server'
import { getRequestUser } from '@/server/current-user'
import { fail, ok } from '@/server/http'
import { resendConfirmation } from '@/server/order-emails'
import { allow } from '@/server/rate-limit'

/** Admin only (anyone else gets a 404). Sends the confirmation now and reports Mailgun's answer. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req)
  if (!user?.isAdmin) return fail('Not found', 404)
  if (!allow(`admin-mail:${user.id}`, 20, 15 * 60 * 1000)) return fail('Too many sends. Try again in a few minutes.', 429)
  const r = await resendConfirmation((await params).id)
  if (!r.ok) return fail(r.error, 502)
  if (r.result === 'skipped') return fail('Email is not configured on this server (MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM).', 503)
  return ok(r.result === 'sent' ? 'Confirmation email sent' : 'Printed to the server log (Mailgun not configured)', r)
}
