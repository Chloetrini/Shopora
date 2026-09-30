import 'server-only'
import { sql } from './client'
import { normalizeLocation } from '@/lib/delivery'
import type { OrderStatus } from '@/lib/order-status'
import type { OrderInput } from '@/lib/validation'

export class OutOfStockError extends Error {
  constructor() {
    super('One or more items are out of stock or no longer available')
  }
}
export class InvalidDiscountError extends Error {
  constructor() {
    super('That discount code isn’t valid any more')
  }
}
export class NoDeliveryError extends Error {
  constructor() {
    super('Sorry, we don’t deliver to that location yet')
  }
}
export class OrderTooLargeError extends Error {
  constructor() {
    super('That order is too large. Please split it into smaller orders.')
  }
}

export type DiscountInfo = { code: string; percentOff: number | null; amountOffCents: number | null }

/** A code that can be used right now (active, not expired, uses left), or null. Used by the checkout preview. */
export async function lookupDiscount(code: string): Promise<DiscountInfo | null> {
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return null
  const rows = await sql()`
    select code, percent_off, amount_off_cents from discount_codes
    where code = ${code} and active and (expires_at is null or expires_at > now()) and (max_uses is null or used_count < max_uses)`
  const r = rows[0]
  return r ? { code: r.code, percentOff: r.percent_off, amountOffCents: r.amount_off_cents } : null
}

/**
 * Creates the order, its lines, the stock decrement, the discount claim and the "Order placed" event in ONE
 * statement, so it is all-or-nothing. Prices and names come from `products`, never from the request. If any
 * line is missing, inactive or short on stock, or the discount code can't be claimed, nothing is written.
 * The discount is claimed by a conditional UPDATE (uses left), so two buyers can't both take the last use.
 * Discount maths mirrors lib/discount.ts: percent floors to a whole kobo, and the total never drops below 5000.
 */
export async function createOrder(input: OrderInput, userId: string | null = null): Promise<{ id: string; subtotalCents: number; discountCents: number }> {
  const items = JSON.stringify(input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })))
  const code = input.discountCode ?? null
  const ctry = normalizeLocation(input.country)
  const reg = normalizeLocation(input.region)
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
      stock_ok as (
        select (select count(*) from lines) = (select count(*) from req) and (select count(*) from req) > 0 as ok
      ),
      sub as (
        select coalesce(sum(price_cents::bigint * quantity), 0) as s from lines
      ),
      zone as (
        select z.name, z.fee_cents, z.free_over_cents from delivery_zones z
        where z.active and (
          (z.country = ${ctry}::text and z.region is not null and z.region = ${reg}::text)
          or (z.country = ${ctry}::text and z.region is null)
          or (z.country = '*' and z.region is null))
        order by case when z.country = ${ctry}::text and z.region is not null then 0
                      when z.country = ${ctry}::text then 1 else 2 end
        limit 1
      ),
      pre_ok as (
        select (select ok from stock_ok) and exists (select 1 from zone) as ok
      ),
      claim as (
        update discount_codes set used_count = used_count + 1
        where code = ${code}::text and (select ok from pre_ok) and active
          and (expires_at is null or expires_at > now()) and (max_uses is null or used_count < max_uses)
        returning code, percent_off, amount_off_cents
      ),
      ok as (
        select (select ok from pre_ok) and (${code}::text is null or exists (select 1 from claim)) as ok
      ),
      disc as (
        select case
                 when (select count(*) from claim) = 0 then 0
                 else greatest(0, least(
                        (select case when c.percent_off is not null then (sub.s * c.percent_off) / 100
                                     else least(c.amount_off_cents::bigint, sub.s) end
                           from claim c, sub),
                        greatest(sub.s - 5000, 0)))
               end as d
        from sub
      ),
      deliv as (
        select case when z.free_over_cents is not null and (sub.s - disc.d) >= z.free_over_cents then 0 else z.fee_cents end as d,
               z.name as zone_name
        from zone z, sub, disc
      ),
      new_order as (
        insert into orders (user_id, email, full_name, address_line1, address_line2, city, region, postal_code, country,
                            subtotal_cents, discount_code, discount_cents, delivery_cents, delivery_zone, total_cents, currency)
        select ${userId}::uuid, ${input.email}, ${input.fullName}, ${input.addressLine1}, nullif(${input.addressLine2}, ''),
               ${input.city}, nullif(${input.region}, ''), ${input.postalCode}, ${input.country},
               sub.s::int, (select code from claim), disc.d::int, deliv.d::int, deliv.zone_name, (sub.s - disc.d + deliv.d)::int,
               (select min(currency) from lines)
        from ok, sub, disc, deliv where ok.ok
        returning id, subtotal_cents, discount_cents
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
      select id, subtotal_cents, discount_cents from new_order`
    if (rows.length === 0) {
      // Nothing was written. Work out why, so the buyer gets a useful message.
      const zone = await sql()`
        select 1 from delivery_zones z where z.active and ((z.country = ${ctry}::text and (z.region is null or z.region = ${reg}::text)) or z.country = '*') limit 1`
      if (zone.length === 0) throw new NoDeliveryError()
      if (code && !(await lookupDiscount(code))) throw new InvalidDiscountError()
      throw new OutOfStockError()
    }
    return { id: rows[0].id as string, subtotalCents: rows[0].subtotal_cents as number, discountCents: rows[0].discount_cents as number }
  } catch (e) {
    if (e instanceof OutOfStockError || e instanceof InvalidDiscountError || e instanceof NoDeliveryError) throw e
    const c = typeof e === 'object' && e && 'code' in e ? e.code : null
    // 23514 = check_violation: stock >= 0 lost a race with another buyer. 22003 = number out of range.
    if (c === '23514') throw new OutOfStockError()
    if (c === '22003') throw new OrderTooLargeError()
    throw e
  }
}

export type OrderView = {
  id: string
  email: string
  fullName: string
  status: OrderStatus
  totalCents: number
  subtotalCents: number
  discountCode: string | null
  discountCents: number
  deliveryCents: number
  deliveryZone: string | null
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
    db`select id, email, full_name, status, total_cents, subtotal_cents, discount_code, discount_cents, delivery_cents, delivery_zone, currency, created_at,
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
    subtotalCents: o.subtotal_cents ?? o.total_cents,
    discountCode: o.discount_code,
    discountCents: o.discount_cents ?? 0,
    deliveryCents: o.delivery_cents ?? 0,
    deliveryZone: o.delivery_zone ?? null,
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
  totalCents: number; currency: string; createdAt: string; itemCount: number; refundNeeded: boolean
}

/** Admin only (the caller checks). Newest first. */
export async function listOrdersForAdmin(limit = 100): Promise<AdminOrderRow[]> {
  const rows = await sql()`
    select o.id, o.email, o.full_name, o.status, o.total_cents, o.currency, o.created_at,
           coalesce((select sum(quantity) from order_items i where i.order_id = o.id), 0)::int as item_count,
           (o.status = 'cancelled' and o.paid_at is not null) as refund_needed
    from orders o order by o.created_at desc limit ${limit}`
  return rows.map((o) => ({
    id: o.id, email: o.email, fullName: o.full_name, status: o.status, totalCents: o.total_cents,
    currency: o.currency, createdAt: new Date(o.created_at).toISOString(), itemCount: o.item_count, refundNeeded: o.refund_needed,
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

export type StockChange = { productId: string; slug: string; name: string }

/**
 * Cancels an UNPAID order (status pending), puts its stock back and gives back the discount use, all in one
 * statement. True for exactly one caller. Returns the products that came back into stock from zero
 * (so "notify me" emails can go out). `reason` is shown on the timeline.
 */
export async function cancelUnpaidOrder(id: string, reason: string): Promise<{ cancelled: boolean; restocked: StockChange[] }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { cancelled: false, restocked: [] }
  const before = await sql()`select p.id from order_items i join products p on p.id = i.product_id where i.order_id = ${id} and p.stock = 0`
  const rows = await sql()`
    with c as (
      update orders set status = 'cancelled' where id = ${id} and status = 'pending' returning id, discount_code
    ),
    r as (
      update products p set stock = p.stock + i.quantity
      from order_items i where i.order_id in (select id from c) and p.id = i.product_id
      returning p.id
    ),
    d as (
      update discount_codes set used_count = greatest(used_count - 1, 0)
      where code in (select discount_code from c where discount_code is not null) returning code
    ),
    e as (
      insert into order_events (order_id, status, note) select id, 'cancelled', ${reason} from c returning order_id
    )
    select id from c`
  if (rows.length !== 1) return { cancelled: false, restocked: [] }
  const ids = before.map((b) => b.id as string)
  if (ids.length === 0) return { cancelled: true, restocked: [] }
  const back = await sql()`select id, slug, name from products where id = any(${ids}::uuid[]) and stock > 0`
  return { cancelled: true, restocked: back.map((p) => ({ productId: p.id, slug: p.slug, name: p.name })) }
}

/** Orders still unpaid after this long are cancelled and their stock released. Returns how many. */
export async function expireStaleOrders(hours = 24): Promise<number> {
  const stale = await sql()`
    select id from orders where status = 'pending' and created_at < now() - (${hours}::int * interval '1 hour') limit 200`
  let n = 0
  for (const o of stale) {
    const r = await cancelUnpaidOrder(o.id as string, 'Cancelled automatically: not paid within ' + hours + ' hours')
    if (r.cancelled) n++
  }
  return n
}

/** A payment arrived for an order that had already been cancelled. Mark it so an admin refunds it. */
export async function flagLatePayment(id: string): Promise<void> {
  await sql()`
    with u as (update orders set paid_at = coalesce(paid_at, now()) where id = ${id} and status = 'cancelled' and paid_at is null returning id)
    insert into order_events (order_id, status, note) select id, 'cancelled', 'Payment received after this order was cancelled. Refund needed.' from u`
}

/** Products whose stock just fell to `threshold` or below because of this order. */
export async function lowStockAfterOrder(orderId: string, threshold = 5): Promise<{ name: string; stock: number }[]> {
  const rows = await sql()`
    select p.name, p.stock from order_items i join products p on p.id = i.product_id
    where i.order_id = ${orderId} and p.stock <= ${threshold} and p.stock + i.quantity > ${threshold}`
  return rows.map((r) => ({ name: r.name as string, stock: r.stock as number }))
}

/** Paid orders whose confirmation email was never sent (oldest first). */
export async function listUnsentConfirmations(limit = 25): Promise<{ id: string; email: string }[]> {
  const rows = await sql()`
    select id, email from orders
    where status in ('confirmed','processing','shipped','out_for_delivery','delivered') and confirmation_sent_at is null
    order by paid_at nulls last, created_at limit ${limit}`
  return rows.map((r) => ({ id: r.id as string, email: r.email as string }))
}

export async function countUnsentConfirmations(): Promise<number> {
  const rows = await sql()`
    select count(*)::int as n from orders
    where status in ('confirmed','processing','shipped','out_for_delivery','delivered') and confirmation_sent_at is null`
  return rows[0].n as number
}
