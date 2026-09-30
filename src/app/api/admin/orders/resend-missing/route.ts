import type { NextRequest } from 'next/server'
import { fail, ok } from '@/server/http'
import { resendMissingConfirmations } from '@/server/order-emails'
import { allow } from '@/server/rate-limit'
import { requireAdmin } from '@/server/require-user'

/** Admin only. Sends every paid order's missing confirmation and says how many worked, and why the rest didn't. */
export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if ('res' in a) return a.res
  if (!allow(`admin-bulk:${a.user.id}`, 5, 15 * 60 * 1000)) return fail('Too many sends. Try again in a few minutes.', 429)
  const r = await resendMissingConfirmations(25)
  if (r.attempted === 0) return ok('Nothing to send: every paid order has its confirmation.', r)
  if (r.sent === r.attempted) return ok(`Sent ${r.sent} confirmation ${r.sent === 1 ? 'email' : 'emails'}.`, r)
  return fail(`Sent ${r.sent} of ${r.attempted}. ${r.reasons.join(' | ')}`, 502, { body: r })
}
