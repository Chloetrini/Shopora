import type { NextRequest } from 'next/server'
import { productCreateSchema } from '@/lib/validation'
import { createProduct } from '@/server/db/features'
import { ok, parseJson } from '@/server/http'
import { requireAdmin } from '@/server/require-user'

/** Adds a product to the shop. The photo is uploaded afterwards through the existing image route. */
export async function POST(req: NextRequest) {
  const a = await requireAdmin(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, productCreateSchema)
  if ('res' in parsed) return parsed.res
  const product = await createProduct(parsed.data)
  return ok('Product added', product, 201)
}
