import 'server-only'
import { sql } from './client'
import type { OrderStatus } from '@/lib/order-status'
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
export async function createOrder(input: OrderInput, userId: string | null = null): Promise<{ id: string }> {
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
        insert into orders (user_id, email, full_name, address_line1, address_line2, city, region, postal_code, country,
                            total_cents, currency)
        select ${userId}::uuid, ${input.email}, ${input.fullName}, ${input.addressLine1}, nullif(${input.addressLine2}, ''),
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
      ),
      ev as (
        insert into order_events (order_id, status, note)
        select id, 'pending', 'Order placed' from new_order
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
  status: OrderStatus
  totalCents: number
  currency: string
  createdAt: string
  address: string
  items: { name: string; unitPriceCents: number; quantity: number }[]
  events: { status: OrderStatus; note: string | null; createdAt: string }[]
}

/** The order id is an unguessable UUID and acts as the guest's access key. Anything else is a 404. */
export async function getOrder(id: string): Promise<OrderView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const db = sql()
  const [orders, items, events] = await Promise.all([
    db`select id, email, full_name, status, total_cents, currency, created_at,
              address_line1, address_line2, city, region, postal_code, country
       from orders where id = ${id}`,
    db`select name, unit_price_cents, quantity from order_items where order_id = ${id} order by name`,
    db`select status, note, created_at from order_events where order_id = ${id} order by created_at, id`,
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
    events: events.map((e) => ({ status: e.status, note: e.note, createdAt: new Date(e.created_at).toISOString() })),
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

/** True for exactly one caller: the one that flips pending to confirmed (and records the event). */
export async function confirmOrder(id: string): Promise<boolean> {
  const rows = await sql()`
    with u as (
      update orders set status = 'confirmed', paid_at = now() where id = ${id} and status = 'pending' returning id
    )
    insert into order_events (order_id, status, note) select id, 'confirmed', 'Payment received' from u returning order_id`
  return rows.length === 1
}

/** True for exactly one caller while no confirmation has been sent or is being sent. */
export async function claimConfirmation(id: string): Promise<boolean> {
  const rows = await sql()`
    update orders set confirmation_sent_at = now()
    where id = ${id} and status in ('confirmed','processing','shipped','out_for_delivery','delivered')
      and confirmation_sent_at is null returning id`
  return rows.length === 1
}

export async function releaseConfirmation(id: string): Promise<void> {
  await sql()`update orders set confirmation_sent_at = null where id = ${id}`
}

export type OrderSummary = { id: string; status: string; totalCents: number; currency: string; createdAt: string; itemCount: number }

/** The signed-in buyer's own orders. `userId` comes from the session cookie, never from the request. */
export async function listOrdersForUser(userId: string): Promise<OrderSummary[]> {
  const rows = await sql()`
    select o.id, o.status, o.total_cents, o.currency, o.created_at,
           coalesce((select sum(quantity) from order_items i where i.order_id = o.id), 0)::int as item_count
    from orders o where o.user_id = ${userId} order by o.created_at desc limit 50`
  return rows.map((o) => ({
    id: o.id, status: o.status, totalCents: o.total_cents, currency: o.currency,
    createdAt: new Date(o.created_at).toISOString(), itemCount: o.item_count,
  }))
}

/** Guest lookup: needs the email AND the start of the order number, so a stray number reveals nothing. */
export async function findOrderIdForTracking(email: string, reference: string): Promise<string | null> {
  const ref = reference.trim().toLowerCase().replace(/^#/, '')
  if (!/^[0-9a-f-]{8,36}$/.test(ref)) return null
  const rows = await sql()`
    select id from orders where email = ${email.trim().toLowerCase()} and id::text like ${ref + '%'} limit 2`
  return rows.length === 1 ? (rows[0].id as string) : null // ambiguous or none: the same answer
}

/**
 * Attaches earlier guest orders to an account. ONLY call this with an email the person has proven they own
 * (a Google-verified email): otherwise anyone could register someone else's address and read their orders.
 */
export async function claimGuestOrders(userId: string, verifiedEmail: string): Promise<number> {
  const rows = await sql()`
    update orders set user_id = ${userId} where user_id is null and email = ${verifiedEmail.toLowerCase()} returning id`
  return rows.length
}

export type AdminOrderRow = {
  id: string; email: string; fullName: string; status: OrderStatus
  totalCents: number; currency: string; createdAt: string; itemCount: number
}

/** Admin only (the caller checks). Newest first. */
export async function listOrdersForAdmin(limit = 100): Promise<AdminOrderRow[]> {
  const rows = await sql()`
    select o.id, o.email, o.full_name, o.status, o.total_cents, o.currency, o.created_at,
           coalesce((select sum(quantity) from order_items i where i.order_id = o.id), 0)::int as item_count
    from orders o order by o.created_at desc limit ${limit}`
  return rows.map((o) => ({
    id: o.id, email: o.email, fullName: o.full_name, status: o.status, totalCents: o.total_cents,
    currency: o.currency, createdAt: new Date(o.created_at).toISOString(), itemCount: o.item_count,
  }))
}

/** Moves an order from `from` to `to` and records the event. True for exactly one caller (conditional update). */
export async function updateOrderStatus(id: string, from: string, to: string, note: string | null): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false
  const rows = await sql()`
    with u as (
      update orders set status = ${to} where id = ${id} and status = ${from} returning id
    )
    insert into order_events (order_id, status, note) select id, ${to}, ${note} from u returning order_id`
  return rows.length === 1
}

/** After a manual resend that Mailgun accepted. */
export async function markConfirmationSent(id: string): Promise<void> {
  await sql()`update orders set confirmation_sent_at = now() where id = ${id}`
}
