import type { NextRequest } from 'next/server'
import { getOrder } from '@/server/db/orders'
import { fail, ok } from '@/server/http'
import { allow, clientIp } from '@/server/rate-limit'

/** One order with its timeline. The unguessable order id is the access key, exactly as on the order page. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!allow(`order-read:${clientIp(req)}`, 120, 60_000)) return fail('Slow down a little.', 429)
  const order = await getOrder((await params).id)
  return order ? ok('Order', { order }) : fail('Not found', 404)
}

export const dynamic = 'force-dynamic'
