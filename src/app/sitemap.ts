import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'
import { listProducts } from '@/server/db/products'

export const dynamic = 'force-dynamic'

// Public pages only. A new public page must be added here; signed-in and payment pages stay out.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const pages = ['/', '/track', '/login', '/register'].map((path) => ({ url: `${base}${path}` }))
  try {
    const products = await listProducts()
    return [...pages, ...products.map((p) => ({ url: `${base}/products/${p.slug}` }))]
  } catch {
    return pages // the database being down shouldn't break the sitemap
  }
}
