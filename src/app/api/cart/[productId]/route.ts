import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { LIMITS } from '@/constants/shop'
import { cartSnapshot, cartUser, cartWriteResponse } from '@/server/cart-api'
import { putCartLine, removeCartLine } from '@/server/db/cart'
import { parseJson } from '@/server/http'

type Ctx = { params: Promise<{ productId: string }> }

const bodySchema = z.object({ quantity: z.number().int().min(0).max(LIMITS.maxQuantityPerLine) }).strict()

/** Sets the quantity of one line. 0 removes it. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const a = await cartUser(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, bodySchema)
  if ('res' in parsed) return parsed.res
  const { productId } = await params
  if (parsed.data.quantity === 0) {
    await removeCartLine(a.user.id, productId)
    return cartSnapshot(a.user.id, 'Removed from your cart')
  }
  return cartWriteResponse(a.user.id, await putCartLine(a.user.id, productId, parsed.data.quantity, 'set'), 'Cart updated')
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const a = await cartUser(req)
  if ('res' in a) return a.res
  await removeCartLine(a.user.id, (await params).productId)
  return cartSnapshot(a.user.id, 'Removed from your cart')
}

export const dynamic = 'force-dynamic'
