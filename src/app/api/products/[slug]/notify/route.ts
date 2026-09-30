import type { NextRequest } from 'next/server'
import { notifySchema } from '@/lib/validation'
import { subscribeStockAlert } from '@/server/db/features'
import { getProductBySlug } from '@/server/db/products'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { allow, clientIp } from '@/server/rate-limit'

/** "Tell me when it's back." The same answer whatever the email, and one email per person per restock. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!allow(`notify:${clientIp(req)}`, 10, 15 * 60 * 1000)) return tooMany()
  const parsed = await parseJson(req, notifySchema)
  if ('res' in parsed) return parsed.res
  const product = await getProductBySlug((await params).slug)
  if (!product) return fail('Not found', 404)
  if (product.stock > 0) return fail('This product is in stock right now.', 409)
  await subscribeStockAlert(product.id, parsed.data.email)
  return ok('We’ll email you once it’s back in stock')
}
