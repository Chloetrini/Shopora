import 'server-only'
import { slugify } from '@/lib/slug'
import { normalizeLocation, type Zone } from '@/lib/delivery'
import { sql } from './client'
import { toProduct, type Product } from './products'

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s)

/* ---------- Wishlist (tenant-owned: every query is scoped by the session's user id) ---------- */

export async function wishlistProductIds(userId: string): Promise<string[]> {
  const rows = await sql()`select product_id from wishlist_items where user_id = ${userId}`
  return rows.map((r) => r.product_id as string)
}

export async function wishlistProducts(userId: string): Promise<Product[]> {
  const rows = await sql()`
    select p.id, p.slug, p.name, p.description, p.price_cents, p.currency, p.image_url, p.category, p.stock
    from wishlist_items w join products p on p.id = w.product_id
    where w.user_id = ${userId} and p.active order by w.created_at desc`
  return rows.map(toProduct)
}

/** False when the product doesn't exist (or is inactive). Adding twice is fine. */
export async function addToWishlist(userId: string, productId: string): Promise<boolean> {
  if (!isUuid(productId)) return false
  const rows = await sql()`
    insert into wishlist_items (user_id, product_id)
    select ${userId}, id from products where id = ${productId} and active
    on conflict do nothing returning product_id`
  if (rows.length > 0) return true
  const exists = await sql()`select 1 from products where id = ${productId} and active`
  return exists.length > 0
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  if (!isUuid(productId)) return
  await sql()`delete from wishlist_items where user_id = ${userId} and product_id = ${productId}`
}

/* ---------- Reviews ---------- */

export type Review = { id: string; authorName: string; rating: number; body: string; createdAt: string; mine: boolean }

export async function listReviews(productId: string, viewerId: string | null): Promise<{ reviews: Review[]; average: number; count: number }> {
  const rows = await sql()`
    select id, user_id, author_name, rating, body, created_at from reviews where product_id = ${productId}
    order by created_at desc limit 50`
  const stats = await sql()`select coalesce(round(avg(rating)::numeric, 1), 0)::float as avg, count(*)::int as n from reviews where product_id = ${productId}`
  return {
    reviews: rows.map((r) => ({
      id: r.id, authorName: r.author_name, rating: r.rating, body: r.body,
      createdAt: new Date(r.created_at).toISOString(), mine: viewerId !== null && r.user_id === viewerId,
    })),
    average: stats[0].avg as number,
    count: stats[0].n as number,
  }
}

/** Only someone with a PAID order containing this product may review it ("verified purchase"). */
export async function hasPurchased(userId: string, productId: string): Promise<boolean> {
  const rows = await sql()`
    select 1 from orders o join order_items i on i.order_id = o.id
    where o.user_id = ${userId} and i.product_id = ${productId}
      and o.status in ('confirmed','processing','shipped','out_for_delivery','delivered') limit 1`
  return rows.length > 0
}

/** One review per person per product: writing again replaces the old one. */
export async function saveReview(userId: string, productId: string, authorName: string, rating: number, body: string): Promise<void> {
  await sql()`
    insert into reviews (product_id, user_id, author_name, rating, body) values (${productId}, ${userId}, ${authorName}, ${rating}, ${body})
    on conflict (user_id, product_id) do update set rating = excluded.rating, body = excluded.body, author_name = excluded.author_name, created_at = now()`
}

export async function deleteMyReview(userId: string, productId: string): Promise<void> {
  await sql()`delete from reviews where user_id = ${userId} and product_id = ${productId}`
}

/** Average and count for many products at once (cards on the shop page). */
export async function ratingSummaries(): Promise<Record<string, { average: number; count: number }>> {
  const rows = await sql()`select product_id, round(avg(rating)::numeric, 1)::float as avg, count(*)::int as n from reviews group by product_id`
  return Object.fromEntries(rows.map((r) => [r.product_id as string, { average: r.avg as number, count: r.n as number }]))
}

/* ---------- Saved addresses (tenant-owned) ---------- */

export type Address = {
  id: string; label: string; fullName: string; addressLine1: string; addressLine2: string
  city: string; region: string; postalCode: string; country: string; isDefault: boolean
}
export const MAX_ADDRESSES = 5

/* eslint-disable @typescript-eslint/no-explicit-any */
const toAddress = (r: any): Address => ({
  id: r.id, label: r.label, fullName: r.full_name, addressLine1: r.address_line1, addressLine2: r.address_line2,
  city: r.city, region: r.region, postalCode: r.postal_code, country: r.country, isDefault: r.is_default,
})

export async function listAddresses(userId: string): Promise<Address[]> {
  const rows = await sql()`
    select id, label, full_name, address_line1, address_line2, city, region, postal_code, country, is_default
    from addresses where user_id = ${userId} order by is_default desc, created_at`
  return rows.map(toAddress)
}

export class TooManyAddressesError extends Error {
  constructor() {
    super(`You can save up to ${MAX_ADDRESSES} addresses. Delete one first.`)
  }
}

export async function createAddress(userId: string, a: Omit<Address, 'id'>): Promise<Address> {
  const have = await sql()`select count(*)::int as n from addresses where user_id = ${userId}`
  if ((have[0].n as number) >= MAX_ADDRESSES) throw new TooManyAddressesError()
  const makeDefault = a.isDefault || have[0].n === 0
  if (makeDefault) await sql()`update addresses set is_default = false where user_id = ${userId}`
  const rows = await sql()`
    insert into addresses (user_id, label, full_name, address_line1, address_line2, city, region, postal_code, country, is_default)
    values (${userId}, ${a.label}, ${a.fullName}, ${a.addressLine1}, ${a.addressLine2}, ${a.city}, ${a.region}, ${a.postalCode}, ${a.country}, ${makeDefault})
    returning id, label, full_name, address_line1, address_line2, city, region, postal_code, country, is_default`
  return toAddress(rows[0])
}

/** False for an id that isn't this user's (another tenant's address is a 404, never a 403). */
export async function deleteAddress(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  const rows = await sql()`delete from addresses where id = ${id} and user_id = ${userId} returning id`
  if (rows.length === 0) return false
  // Keep one default if any are left.
  await sql()`
    update addresses set is_default = true where id = (select id from addresses where user_id = ${userId} order by created_at limit 1)
      and not exists (select 1 from addresses where user_id = ${userId} and is_default)`
  return true
}

export async function setDefaultAddress(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  const own = await sql()`select 1 from addresses where id = ${id} and user_id = ${userId}`
  if (own.length === 0) return false
  await sql()`update addresses set is_default = (id = ${id}) where user_id = ${userId}`
  return true
}

/** Saves the checkout address unless an identical one is already saved. */
export async function saveAddressIfNew(userId: string, a: Omit<Address, 'id' | 'isDefault' | 'label'>): Promise<void> {
  const dup = await sql()`
    select 1 from addresses where user_id = ${userId} and lower(address_line1) = lower(${a.addressLine1}) and lower(postal_code) = lower(${a.postalCode})`
  if (dup.length > 0) return
  try {
    await createAddress(userId, { ...a, label: '', isDefault: false })
  } catch (e) {
    if (!(e instanceof TooManyAddressesError)) throw e // a full address book just doesn't save
  }
}

/* ---------- Stock alerts ("notify me when back in stock") ---------- */

export async function subscribeStockAlert(productId: string, email: string): Promise<void> {
  await sql()`insert into stock_alerts (product_id, email) values (${productId}, ${email}) on conflict do nothing`
}

/** Returns the subscribers and removes them, so each person is told once. */
export async function takeStockAlerts(productId: string): Promise<string[]> {
  const rows = await sql()`delete from stock_alerts where product_id = ${productId} returning email`
  return rows.map((r) => r.email as string)
}

/* ---------- Discount codes (admin) ---------- */

export type DiscountRow = {
  code: string; percentOff: number | null; amountOffCents: number | null; active: boolean
  expiresAt: string | null; maxUses: number | null; usedCount: number
}

export async function listDiscounts(): Promise<DiscountRow[]> {
  const rows = await sql()`select code, percent_off, amount_off_cents, active, expires_at, max_uses, used_count from discount_codes order by created_at desc limit 100`
  return rows.map((r) => ({
    code: r.code, percentOff: r.percent_off, amountOffCents: r.amount_off_cents, active: r.active,
    expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null, maxUses: r.max_uses, usedCount: r.used_count,
  }))
}

export class DiscountExistsError extends Error {
  constructor() {
    super('A code with that name already exists')
  }
}

export async function createDiscount(d: { code: string; percentOff: number | null; amountOffCents: number | null; maxUses: number | null; expiresAt: string | null }): Promise<void> {
  try {
    await sql()`
      insert into discount_codes (code, percent_off, amount_off_cents, max_uses, expires_at)
      values (${d.code}, ${d.percentOff}, ${d.amountOffCents}, ${d.maxUses}, ${d.expiresAt})`
  } catch (e) {
    if (typeof e === 'object' && e && 'code' in e && e.code === '23505') throw new DiscountExistsError()
    throw e
  }
}

export async function setDiscountActive(code: string, active: boolean): Promise<boolean> {
  const rows = await sql()`update discount_codes set active = ${active} where code = ${code} returning code`
  return rows.length === 1
}

/* ---------- Products (admin) ---------- */

/** Adds a product. The slug comes from the name; if it is taken, "-2", "-3"… is added. Prices are stored in kobo. */
export async function createProduct(p: { name: string; description: string; priceNaira: number; stock: number; category: string }): Promise<{ id: string; slug: string }> {
  const base = slugify(p.name)
  for (let n = 1; n <= 30; n++) {
    const slug = n === 1 ? base : `${base.slice(0, 70)}-${n}`
    try {
      const rows = await sql()`
        insert into products (slug, name, description, price_cents, currency, category, stock)
        values (${slug}, ${p.name}, ${p.description}, ${p.priceNaira * 100}, 'NGN', ${p.category}, ${p.stock})
        returning id`
      return { id: rows[0].id as string, slug }
    } catch (e) {
      if (typeof e === 'object' && e && 'code' in e && e.code === '23505') continue // slug taken, try the next one
      throw e
    }
  }
  throw new Error('Could not find a free slug')
}

export type AdminProduct = Product & { active: boolean; hasUploadedImage: boolean }

export async function listAllProducts(): Promise<AdminProduct[]> {
  const rows = await sql()`
    select id, slug, name, description, price_cents, currency, image_url, category, stock, active, (image_b64 is not null) as has_upload
    from products order by created_at, name`
  return rows.map((r) => ({ ...toProduct(r), active: r.active as boolean, hasUploadedImage: r.has_upload as boolean }))
}

/** Sets stock/active. Returns the previous stock so the caller can see a sold-out product come back. */
export async function updateProductAdmin(id: string, patch: { stock?: number; active?: boolean }): Promise<{ found: boolean; wasZero: boolean; slug: string; name: string; stock: number }> {
  if (!isUuid(id)) return { found: false, wasZero: false, slug: '', name: '', stock: 0 }
  const before = await sql()`select stock from products where id = ${id}`
  if (before.length === 0) return { found: false, wasZero: false, slug: '', name: '', stock: 0 }
  const rows = await sql()`
    update products set stock = coalesce(${patch.stock ?? null}::int, stock), active = coalesce(${patch.active ?? null}::boolean, active)
    where id = ${id} returning slug, name, stock`
  return { found: true, wasZero: before[0].stock === 0, slug: rows[0].slug, name: rows[0].name, stock: rows[0].stock }
}

export async function saveProductImage(slug: string, b64: string, type: string): Promise<boolean> {
  const rows = await sql()`
    update products set image_b64 = ${b64}, image_type = ${type}, image_url = ${'/api/products/' + slug + '/image?v=' + Date.now()}
    where slug = ${slug} returning id`
  return rows.length === 1
}

export async function getProductImage(slug: string): Promise<{ bytes: Buffer; type: string } | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null
  const rows = await sql()`select image_b64, image_type from products where slug = ${slug} and image_b64 is not null`
  const r = rows[0]
  return r ? { bytes: Buffer.from(r.image_b64 as string, 'base64'), type: r.image_type as string } : null
}

/* ---------- Delivery zones ---------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
const toZone = (r: any): Zone => ({ id: r.id, name: r.name, country: r.country, region: r.region, feeCents: r.fee_cents, freeOverCents: r.free_over_cents, active: r.active })

/** Public: what checkout needs to show a fee while the buyer types. No secrets here. */
export async function listActiveZones(): Promise<Zone[]> {
  const rows = await sql()`select id, name, country, region, fee_cents, free_over_cents, active from delivery_zones where active order by country, region nulls last`
  return rows.map(toZone)
}

export async function listAllZones(): Promise<Zone[]> {
  const rows = await sql()`select id, name, country, region, fee_cents, free_over_cents, active from delivery_zones order by country, region nulls last`
  return rows.map(toZone)
}

export class ZoneExistsError extends Error {
  constructor() {
    super('There is already a zone for that location')
  }
}

export async function createZone(z: { name: string; country: string; region: string | null; feeCents: number; freeOverCents: number | null }): Promise<void> {
  try {
    await sql()`
      insert into delivery_zones (name, country, region, fee_cents, free_over_cents)
      values (${z.name}, ${normalizeLocation(z.country) || '*'}, ${z.region ? normalizeLocation(z.region) : null}, ${z.feeCents}, ${z.freeOverCents})`
  } catch (e) {
    if (typeof e === 'object' && e && 'code' in e && e.code === '23505') throw new ZoneExistsError()
    throw e
  }
}

export async function updateZone(id: string, patch: { feeCents?: number; freeOverCents?: number | null; active?: boolean }): Promise<boolean> {
  if (!isUuid(id)) return false
  const clear = patch.freeOverCents === null
  const rows = await sql()`
    update delivery_zones set
      fee_cents = coalesce(${patch.feeCents ?? null}::int, fee_cents),
      free_over_cents = case when ${clear}::boolean then null else coalesce(${patch.freeOverCents ?? null}::int, free_over_cents) end,
      active = coalesce(${patch.active ?? null}::boolean, active)
    where id = ${id} returning id`
  return rows.length === 1
}
