import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/shop/product-card'
import { ProductImage } from '@/components/shop/product-image'
import { AddToCartButton } from '@/components/shop/add-to-cart-button'
import { catalogHref, categoryLabel } from '@/lib/catalog'
import { formatMoney } from '@/lib/money'
import { getProductBySlug, listProducts } from '@/server/db/products'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug)
  return p ? { title: p.name, description: p.description } : { title: 'Product not found' }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug)
  if (!product) notFound()
  const related = (await listProducts()).filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/#shop" className="hover:underline">Shop</Link> / <Link href={catalogHref({ category: product.category })} className="hover:underline">{categoryLabel(product.category)}</Link> / <span className="text-foreground">{product.name}</span>
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="group overflow-hidden rounded-3xl border border-border">
          <ProductImage slug={product.slug} category={product.category} name={product.name} imageUrl={product.imageUrl} className="aspect-square" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{categoryLabel(product.category)}</p>
          <h1 className="font-display mt-2 text-4xl font-semibold">{product.name}</h1>
          <p className="mt-4 text-3xl font-semibold">{formatMoney(product.priceCents, product.currency)}</p>
          <p className="mt-5 max-w-prose text-muted-foreground">{product.description}</p>
          <p className="mt-5 text-sm">
            {product.stock === 0 ? 'Sold out' : product.stock <= 10 ? `Only ${product.stock} left in stock` : 'In stock'}
          </p>
          <div className="max-w-sm"><AddToCartButton product={product} /></div>
          <ul className="mt-8 space-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
            <li>Secure payment with Paystack.</li>
            <li>Email receipt, then shipping and delivery updates.</li>
            <li>Track your order with or without an account.</li>
          </ul>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold">You may also like</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{related.map((p) => <ProductCard key={p.id} product={p} />)}</ul>
        </section>
      )}
    </>
  )
}
