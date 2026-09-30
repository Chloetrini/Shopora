import type { NextRequest } from 'next/server'
import { discountCreateSchema } from '@/lib/validation'
import { createDiscount, DiscountExistsError } from '@/server/db/features'
import { fail, ok, parseJson } from '@/server/http'
import { requireAdmin } from '@/server/require-user'

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, discountCreateSchema)
  if ('res' in parsed) return parsed.res
  const d = parsed.data
  try {
    await createDiscount({
      code: d.code,
      percentOff: d.percentOff ?? null,
      amountOffCents: d.amountOffNaira != null ? d.amountOffNaira * 100 : null, // the form takes naira; we store kobo
      maxUses: d.maxUses ?? null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
    })
    return ok('Code created', undefined, 201)
  } catch (e) {
    if (e instanceof DiscountExistsError) return fail(e.message, 409, { details: [{ path: 'code', message: e.message }] })
    throw e
  }
}
