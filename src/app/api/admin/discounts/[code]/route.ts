import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { setDiscountActive } from '@/server/db/features'
import { fail, ok, parseJson } from '@/server/http'
import { requireAdmin } from '@/server/require-user'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const a = await requireAdmin(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, z.object({ active: z.boolean() }).strict())
  if ('res' in parsed) return parsed.res
  const code = (await params).code.toUpperCase()
  return (await setDiscountActive(code, parsed.data.active)) ? ok('Code updated') : fail('Not found', 404)
}
