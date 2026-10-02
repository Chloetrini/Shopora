import 'server-only'
import type { NextRequest } from 'next/server'
import { getCart, type CartWrite } from './db/cart'
import { fail, ok } from './http'
import { allow } from './rate-limit'
import { requireUser } from './require-user'

/** Signed-in buyer (cookie on the web, bearer token on the phone), rate limited per user. */
export async function cartUser(req: NextRequest) {
  const a = await requireUser(req)
  if ('res' in a) return a
  if (!allow(`cart:${a.user.id}`, 240, 60_000)) return { res: fail('Slow down a little.', 429) }
  return a
}

/** Every cart answer carries the whole cart, so a client can simply replace what it has. */
export async function cartSnapshot(userId: string, message: string) {
  const items = await getCart(userId)
  return ok(message, { items })
}

export async function cartWriteResponse(userId: string, result: CartWrite, message: string) {
  if (result === 'no_product') return fail('That product isn’t available.', 404)
  if (result === 'full') return fail('Your cart is full. Remove something first.', 409, { code: 'cart_full' })
  return cartSnapshot(userId, message)
}
