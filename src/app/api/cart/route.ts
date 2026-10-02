import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { LIMITS } from '@/constants/shop'
import { clearCart, mergeCart, putCartLine } from '@/server/db/cart'
import { cartWriteResponse, cartSnapshot, cartUser } from '@/server/cart-api'
import { parseJson } from '@/server/http'

const lineSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(LIMITS.maxQuantityPerLine) }).strict()
const mergeSchema = z.object({ items: z.array(lineSchema).max(LIMITS.maxCartLines) }).strict()

/** The signed-in buyer's cart. The website and the phone app both read this. */
export async function GET(req: NextRequest) {
  const a = await cartUser(req)
  if ('res' in a) return a.res
  return cartSnapshot(a.user.id, 'Your cart')
}

/** Adds to the cart: `{ productId, quantity }` adds that many. */
export async function POST(req: NextRequest) {
  const a = await cartUser(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, lineSchema)
  if ('res' in parsed) return parsed.res
  return cartWriteResponse(a.user.id, await putCartLine(a.user.id, parsed.data.productId, parsed.data.quantity, 'add'), 'Added to your cart')
}

/** Merges a guest's browser cart into the account cart right after sign-in. */
export async function PUT(req: NextRequest) {
  const a = await cartUser(req)
  if ('res' in a) return a.res
  const parsed = await parseJson(req, mergeSchema)
  if ('res' in parsed) return parsed.res
  await mergeCart(a.user.id, parsed.data.items)
  return cartSnapshot(a.user.id, 'Cart merged')
}

export async function DELETE(req: NextRequest) {
  const a = await cartUser(req)
  if ('res' in a) return a.res
  await clearCart(a.user.id)
  return cartSnapshot(a.user.id, 'Cart cleared')
}

export const dynamic = 'force-dynamic'
