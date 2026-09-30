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

export async function listProducts(): Promise<Product[]> {
  const rows = await sql()`
    select id, slug, name, description, price_cents, currency, image_url, category, stock
    from products where active = true order by created_at, name`
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    priceCents: r.price_cents,
    currency: r.currency,
    imageUrl: r.image_url,
    category: r.category,
    stock: r.stock,
  }))
}
