import type { NextRequest } from 'next/server'
import { addToWishlist, removeFromWishlist } from '@/server/db/features'
import { fail, ok } from '@/server/http'
import { allow } from '@/server/rate-limit'
import { requireUser } from '@/server/require-user'

type Ctx = { params: Promise<{ productId: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  if (!allow(`wish:${a.user.id}`, 120, 60_000)) return fail('Slow down a little.', 429)
  const found = await addToWishlist(a.user.id, (await params).productId)
  return found ? ok('Saved to your wishlist') : fail('Not found', 404)
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const a = await requireUser(req)
  if ('res' in a) return a.res
  await removeFromWishlist(a.user.id, (await params).productId)
  return ok('Removed from your wishlist')
}
