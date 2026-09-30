import 'server-only'
import { sql } from './client'

export type Product = {
  id: string
  slug: string
  name: string
  description: string
  priceCents: number
  currency: string
  imageUrl: string | null
  category: string
  stock: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const toProduct = (r: any): Product => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    priceCents: r.price_cents,
    currency: r.currency,
    imageUrl: r.image_url,
    category: r.category,
    stock: r.stock,
})

export async function listProducts(): Promise<Product[]> {
  const rows = await sql()`
    select id, slug, name, description, price_cents, currency, image_url, category, stock
    from products where active = true order by created_at, name`
  return rows.map(toProduct)
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null
  const rows = await sql()`
    select id, slug, name, description, price_cents, currency, image_url, category, stock
    from products where active = true and slug = ${slug}`
  return rows[0] ? toProduct(rows[0]) : null
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const rows = await sql()`select id, slug, name, description, price_cents, currency, image_url, category, stock from products where id = ${id}`
  return rows[0] ? toProduct(rows[0]) : null
}
