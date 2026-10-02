import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminTabs } from '@/components/shop/admin-tabs'
import { ProductAdminRow } from '@/components/shop/admin-forms'
import { ProductImage } from '@/components/shop/product-image'
import { formatMoney } from '@/lib/money'
import { getSessionUser } from '@/server/current-user'
import { listAllProducts } from '@/server/db/features'

export const metadata: Metadata = { title: 'Manage products', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const user = await getSessionUser()
  if (!user?.isAdmin) notFound()
  const products = await listAllProducts()
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Manage products</h1>
      <p className="mb-5 mt-1 text-muted-foreground">Change stock, hide a product, or upload your own photo (JPG, PNG or WebP, under 1.5 MB). Restocking a sold-out product emails the people waiting for it.</p>
      <AdminTabs current="/admin/products" />
      <ul className="space-y-3">
        {products.map((p) => (
          <li key={p.id} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
            <ProductImage name={p.name} imageUrl={p.imageUrl} className="size-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/products/${p.slug}`} className="font-medium hover:underline">{p.name}</Link>
                {!p.active && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs">Hidden</span>}
                {p.stock === 0 && <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-ink-foreground">Sold out</span>}
              </div>
              <p className="text-sm text-muted-foreground">{formatMoney(p.priceCents, p.currency)}</p>
              <div className="mt-2"><ProductAdminRow id={p.id} stock={p.stock} active={p.active} hasUpload={p.hasUploadedImage} /></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
