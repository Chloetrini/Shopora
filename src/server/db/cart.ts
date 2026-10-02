import 'server-only'
import { LIMITS } from '@/constants/shop'
import type { CartItem } from '@/lib/cart'
import { sql } from './client'

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s)

/* Tenant-owned: every query is scoped by the session's user id, which never comes from the request. */

/** The buyer's cart with today's name and price. Products that were switched off drop out of view. */
export async function getCart(userId: string): Promise<CartItem[]> {
  const rows = await sql()`
    select c.product_id, c.quantity, p.name, p.slug, p.price_cents, p.currency, p.image_url, p.stock
    from cart_items c join products p on p.id = c.product_id
    where c.user_id = ${userId} and p.active
    order by c.created_at, c.product_id`
  return rows.map((r) => ({
    productId: r.product_id as string,
    name: r.name as string,
    priceCents: r.price_cents as number,
    currency: r.currency as string,
    quantity: r.quantity as number,
    slug: r.slug as string,
    imageUrl: (r.image_url as string | null) ?? null,
    stock: r.stock as number,
  }))
}

export type CartWrite = 'ok' | 'no_product' | 'full'

/**
 * Adds `delta` to a line (or creates it). A new line is refused once the cart already has the maximum number of lines.
 * `mode: 'set'` replaces the quantity instead of adding to it.
 */
export async function putCartLine(userId: string, productId: string, quantity: number, mode: 'add' | 'set'): Promise<CartWrite> {
  if (!isUuid(productId)) return 'no_product'
  const q = Math.min(LIMITS.maxQuantityPerLine, Math.max(1, Math.floor(quantity)))
  const db = sql()
  const product = await db`select 1 from products where id = ${productId} and active`
  if (product.length === 0) return 'no_product'
  const rows = await db`
    insert into cart_items (user_id, product_id, quantity)
    select ${userId}::uuid, ${productId}::uuid, ${q}::int
    where exists (select 1 from cart_items where user_id = ${userId}::uuid and product_id = ${productId}::uuid)
       or (select count(*) from cart_items where user_id = ${userId}::uuid) < ${LIMITS.maxCartLines}::int
    on conflict (user_id, product_id) do update
      set quantity = case when ${mode === 'add'}::boolean then least(${LIMITS.maxQuantityPerLine}::int, cart_items.quantity + excluded.quantity) else excluded.quantity end,
          updated_at = now()
    returning product_id`
  return rows.length > 0 ? 'ok' : 'full'
}

export async function removeCartLine(userId: string, productId: string): Promise<void> {
  if (!isUuid(productId)) return
  await sql()`delete from cart_items where user_id = ${userId} and product_id = ${productId}`
}

export async function clearCart(userId: string): Promise<void> {
  await sql()`delete from cart_items where user_id = ${userId}`
}

/** Folds a guest's browser cart into the account cart. A line already there keeps the larger quantity. */
export async function mergeCart(userId: string, lines: { productId: string; quantity: number }[]): Promise<void> {
  for (const l of lines.slice(0, LIMITS.maxCartLines)) {
    if (!isUuid(l.productId)) continue
    const q = Math.min(LIMITS.maxQuantityPerLine, Math.max(1, Math.floor(l.quantity)))
    await sql()`
      insert into cart_items (user_id, product_id, quantity)
      select ${userId}::uuid, id, ${q}::int from products where id = ${l.productId}::uuid and active
      on conflict (user_id, product_id) do update
        set quantity = greatest(cart_items.quantity, excluded.quantity), updated_at = now()`
  }
  // Never more than the maximum number of lines, oldest first.
  await sql()`
    delete from cart_items where user_id = ${userId}::uuid and product_id in (
      select product_id from cart_items where user_id = ${userId}::uuid order by created_at, product_id offset ${LIMITS.maxCartLines}::int)`
}
