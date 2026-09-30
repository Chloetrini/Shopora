import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { lookupDiscount } from '@/server/db/orders'
import { fail, ok, parseJson, tooMany } from '@/server/http'
import { allow, clientIp } from '@/server/rate-limit'

const bodySchema = z.object({ code: z.string().trim().max(20) }).strict()

/** Checkout preview. Rate limited so codes can't be guessed; unknown, expired and used-up codes look identical. */
export async function POST(req: NextRequest) {
  if (!allow(`discount:${clientIp(req)}`, 30, 15 * 60 * 1000)) return tooMany()
  const parsed = await parseJson(req, bodySchema)
  if ('res' in parsed) return parsed.res
  const d = await lookupDiscount(parsed.data.code.toUpperCase())
  if (!d) return fail('That code isn’t valid.', 404)
  return ok('Code applied', d)
}
