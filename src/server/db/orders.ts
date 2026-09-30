import 'server-only'
import { sql } from './client'
import type { OrderInput } from '@/lib/validation'

export class OutOfStockError extends Error {
  constructor() {
    super('One or more items are out of stock or no longer available')
  }
}

/**
 * Creates the order, its lines and the stock decrement in ONE statement, so it is all-or-nothing.
 * Prices and names come from `products`, never from the request. If any requested line is missing,
 * inactive or short on stock, `ok` is false and nothing is written. Two buyers racing for the last
 * unit: the second `stock >= 0` check constraint fails and the whole statement rolls back.
 */
export async function createOrder(input: OrderInput): Promise<{ id: string }> {
  const items = JSON.stringify(input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })))
  try {
    const rows = await sql()`
      with req as (
        select product_id, sum(quantity)::int as quantity
        from jsonb_to_recordset(${items}::jsonb) as r(product_id uuid, quantity int)
        group by product_id
      ),
      lines as (
        select p.id, p.name, p.price_cents, p.currency, r.quantity
        from req r join products p on p.id = r.product_id
        where p.active and p.stock >= r.quantity
      ),
      ok as (
        select (select count(*) from lines) = (select count(*) from req)
           and (select count(*) from req) > 0 as ok
      ),
      new_order as (
        insert into orders (email, full_name, address_line1, address_line2, city, region, postal_code, country,
                            total_cents, currency)
        select ${input.email}, ${input.fullName}, ${input.addressLine1}, nullif(${input.addressLine2}, ''),
               ${input.city}, nullif(${input.region}, ''), ${input.postalCode}, ${input.country},
               (select sum(price_cents * quantity) from lines)::int, (select min(currency) from lines)
        from ok where ok.ok
        returning id
      ),
      dec as (
        update products p set stock = p.stock - l.quantity
        from lines l where p.id = l.id and exists (select 1 from new_order)
        returning p.id
      ),
      items as (
        insert into order_items (order_id, product_id, name, unit_price_cents, quantity)
        select (select id from new_order), l.id, l.name, l.price_cents, l.quantity
        from lines l where exists (select 1 from new_order)
        returning id
      )
      select id from new_order`
    if (rows.length === 0) throw new OutOfStockError()
    return { id: rows[0].id as string }
  } catch (e) {
    // 23514 = check_violation: the stock >= 0 constraint lost a race with another buyer.
    if (e instanceof OutOfStockError) throw e
    if (typeof e === 'object' && e && 'code' in e && e.code === '23514') throw new OutOfStockError()
    throw e
  }
}

export type OrderView = {
  id: string
  email: string
  fullName: string
  status: 'pending' | 'confirmed' | 'cancelled'
  totalCents: number
  currency: string
  createdAt: string
  address: string
  items: { name: string; unitPriceCents: number; quantity: number }[]
}

/** The order id is an unguessable UUID and acts as the guest's access key. Anything else is a 404. */
export async function getOrder(id: string): Promise<OrderView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const db = sql()
  const [orders, items] = await Promise.all([
    db`select id, email, full_name, status, total_cents, currency, created_at,
              address_line1, address_line2, city, region, postal_code, country
       from orders where id = ${id}`,
    db`select name, unit_price_cents, quantity from order_items where order_id = ${id} order by name`,
  ])
  const o = orders[0]
  if (!o) return null
  return {
    id: o.id,
    email: o.email,
    fullName: o.full_name,
    status: o.status,
    totalCents: o.total_cents,
    currency: o.currency,
    createdAt: new Date(o.created_at).toISOString(),
    address: [o.address_line1, o.address_line2, o.city, o.region, o.postal_code, o.country].filter(Boolean).join(', '),
    items: items.map((i) => ({ name: i.name, unitPriceCents: i.unit_price_cents, quantity: i.quantity })),
  }
}

export type PaymentOrder = { id: string; email: string; status: string; totalCents: number; currency: string }

export async function getOrderForPayment(id: string): Promise<PaymentOrder | null> {
  const rows = await sql()`select id, email, status, total_cents, currency from orders where id = ${id}`
  const o = rows[0]
  return o ? { id: o.id, email: o.email, status: o.status, totalCents: o.total_cents, currency: o.currency } : null
}

/** Records the latest attempt. Only pending orders can be paid, so anything else returns null. */
export async function setPaymentReference(id: string, reference: string): Promise<PaymentOrder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await sql()`
    update orders set paystack_reference = ${reference}
    where id = ${id} and status = 'pending'
    returning id, email, status, total_cents, currency`
  const o = rows[0]
  return o ? { id: o.id, email: o.email, status: o.status, totalCents: o.total_cents, currency: o.currency } : null
}

/** True for exactly one caller: the one that flips pending to confirmed. */
export async function confirmOrder(id: string): Promise<boolean> {
  const rows = await sql()`
    update orders set status = 'confirmed', paid_at = now() where id = ${id} and status = 'pending' returning id`
  return rows.length === 1
}

/** True for exactly one caller while no confirmation has been sent or is being sent. */
export async function claimConfirmation(id: string): Promise<boolean> {
  const rows = await sql()`
    update orders set confirmation_sent_at = now()
    where id = ${id} and status = 'confirmed' and confirmation_sent_at is null returning id`
  return rows.length === 1
}

export async function releaseConfirmation(id: string): Promise<void> {
  await sql()`update orders set confirmation_sent_at = null where id = ${id}`
}
