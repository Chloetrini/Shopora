import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

// Public pages only. A new public page must be added here; signed-in and payment pages stay out.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  return ['/', '/login', '/register'].map((path) => ({ url: `${base}${path}` }))
}
