import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { canTransition, isOrderStatus, NOTIFY_STATUSES } from '@/lib/order-status'
import { getRequestUser } from '@/server/current-user'
import { getOrderForPayment, updateOrderStatus } from '@/server/db/orders'
import { fail, ok, parseJson } from '@/server/http'
import { sendStatusEmail } from '@/server/order-emails'
import { allow } from '@/server/rate-limit'

const bodySchema = z.object({ status: z.string(), note: z.string().trim().max(300).optional() }).strict()

/** Admin only. Anyone else gets a 404, so the route doesn't even confirm it exists. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(req)
  if (!user?.isAdmin) return fail('Not found', 404)
  if (!allow(`admin:${user.id}`, 120, 60_000)) return fail('Slow down a little.', 429)
  const parsed = await parseJson(req, bodySchema)
  if ('res' in parsed) return parsed.res
  const { status, note } = parsed.data
  if (!isOrderStatus(status)) return fail('Unknown status', 400)

  const { id } = await params
  const order = await getOrderForPayment(id)
  if (!order) return fail('Not found', 404)
  if (!canTransition(order.status, status)) {
    return fail(`An order that is ${order.status.replace(/_/g, ' ')} cannot be changed to ${status.replace(/_/g, ' ')}.`, 409)
  }
  // Conditional on the status we just read, so two clicks can't both apply (and email twice).
  const changed = await updateOrderStatus(id, order.status, status, note || null)
  if (!changed) return fail('This order was just changed by someone else. Refresh and try again.', 409)
  if (NOTIFY_STATUSES.includes(status)) await sendStatusEmail(id, status, note || null)
  return ok('Order updated', { id, status })
}
