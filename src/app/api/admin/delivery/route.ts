import type { NextRequest } from 'next/server'
import { zoneCreateSchema } from '@/lib/validation'
import { createZone, ZoneExistsError } from '@/server/db/features'
import { fail, ok, parseJson } from '@/server/http'
import { requireAdmin } from '@/server/require-user'

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, zoneCreateSchema)
  if ('res' in parsed) return parsed.res
  const z = parsed.data
  try {
    await createZone({ name: z.name, country: z.country, region: z.region || null, feeCents: z.feeNaira * 100, freeOverCents: z.freeOverNaira != null ? z.freeOverNaira * 100 : null })
    return ok('Zone created', undefined, 201)
  } catch (e) {
    if (e instanceof ZoneExistsError) return fail(e.message, 409)
    throw e
  }
}
