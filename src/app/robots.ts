import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/cart', '/checkout', '/orders', '/admin', '/wishlist', '/addresses'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
