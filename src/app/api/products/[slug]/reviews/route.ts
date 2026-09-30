import type { NextRequest } from 'next/server'
import { authorLabel } from '@/lib/review'
import { reviewSchema } from '@/lib/validation'
import { deleteMyReview, hasPurchased, saveReview } from '@/server/db/features'
import { getProductBySlug } from '@/server/db/products'
import { fail, ok, parseJson } from '@/server/http'
import { allow } from '@/server/rate-limit'
import { requireUser } from '@/server/require-user'

type Ctx = { params: Promise<{ slug: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  if (!allow(`review:${a.user.id}`, 10, 15 * 60 * 1000)) return fail('Too many reviews. Try again in a few minutes.', 429)
  const parsed = await parseJson(req, reviewSchema)
  if ('res' in parsed) return parsed.res
  const product = await getProductBySlug((await params).slug)
  if (!product) return fail('Not found', 404)
  // Only people who paid for this product can review it.
  if (!(await hasPurchased(a.user.id, product.id))) return fail('Only customers who bought this product can review it.', 403)
  await saveReview(a.user.id, product.id, authorLabel(a.user.fullName), parsed.data.rating, parsed.data.body)
  return ok('Thanks for your review')
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  const product = await getProductBySlug((await params).slug)
  if (!product) return fail('Not found', 404)
  await deleteMyReview(a.user.id, product.id) // scoped to the session's user: you can only delete your own
  return ok('Review deleted')
}
