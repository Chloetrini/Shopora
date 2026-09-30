import type { NextRequest } from 'next/server'
import { zonePatchSchema } from '@/lib/validation'
import { updateZone } from '@/server/db/features'
import { fail, ok, parseJson } from '@/server/http'
import { requireAdmin } from '@/server/require-user'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, zonePatchSchema)
  if ('res' in parsed) return parsed.res
  const p = parsed.data
  const done = await updateZone((await params).id, {
    feeCents: p.feeNaira != null ? p.feeNaira * 100 : undefined,
    freeOverCents: p.freeOverNaira === null ? null : p.freeOverNaira != null ? p.freeOverNaira * 100 : undefined,
    active: p.active,
  })
  return done ? ok('Zone updated') : fail('Not found', 404)
}
