import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { updateProductAdmin } from '@/server/db/features'
import { fail, ok, parseJson } from '@/server/http'
import { requireAdmin } from '@/server/require-user'
import { notifyBackInStock } from '@/server/restock'

const patchSchema = z.object({ stock: z.number().int().min(0).max(100000).optional(), active: z.boolean().optional() }).strict()

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, patchSchema)
  if ('res' in parsed) return parsed.res
  const { id } = await params
  const r = await updateProductAdmin(id, parsed.data)
  if (!r.found) return fail('Not found', 404)
  // Sold out before, in stock now: tell the people who asked.
  let notified = 0
  if (r.wasZero && r.stock > 0) notified = await notifyBackInStock({ productId: id, slug: r.slug, name: r.name })
  return ok('Product updated', { stock: r.stock, notified })
}
