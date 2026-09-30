import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { findOrderIdForTracking } from '@/server/db/orders'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { allow, clientIp } from '@/server/rate-limit'

const bodySchema = z
  .object({ email: z.string().trim().toLowerCase().email('Enter the email you ordered with'), reference: z.string().trim().min(8, 'Enter your order number').max(40) })
  .strict()

/** Guest order lookup. One generic answer whether the email or the number was wrong. */
export async function POST(req: NextRequest) {
  if (!allow(`track:${clientIp(req)}`, 20, 15 * 60 * 1000)) return tooMany()
  const parsed = await parseJson(req, bodySchema)
  if ('res' in parsed) return parsed.res
  const id = await findOrderIdForTracking(parsed.data.email, parsed.data.reference)
  if (!id) return fail('We couldn’t find an order with that email and order number.', 404)
  return ok('Order found', { id })
}
