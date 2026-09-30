import type { NextRequest } from 'next/server'
import { cancelUnpaidOrder } from '@/server/db/orders'
import { fail, ok, tooMany } from '@/server/http'
import { allow, clientIp } from '@/server/rate-limit'
import { notifyBackInStock } from '@/server/restock'

/**
 * Cancel an order that has NOT been paid (the order id in the URL is the access key, like the order page).
 * A paid order can't be cancelled here: the conditional update only matches status "pending". Stock and the
 * discount use are given back in the same statement.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!allow(`cancel:${clientIp(req)}`, 20, 15 * 60 * 1000)) return tooMany()
  const r = await cancelUnpaidOrder((await params).id, 'Cancelled by you before paying')
  if (!r.cancelled) return fail('This order can’t be cancelled any more. Only unpaid orders can be.', 409)
  await Promise.all(r.restocked.map((p) => notifyBackInStock(p)))
  return ok('Order cancelled')
}
