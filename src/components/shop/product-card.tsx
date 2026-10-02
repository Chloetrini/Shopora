import Link from 'next/link'
import { categoryLabel } from '@/lib/catalog'
import { formatMoney } from '@/lib/money'
import type { Product } from '@/server/db/products'
import { AddToCartButton } from './add-to-cart-button'
import { Stars } from './stars'
import { WishlistButton } from './wishlist-button'
import { ProductImage } from './product-image'

export function ProductCard({ product, wished = false, signedIn = false, rating }: { product: Product; wished?: boolean; signedIn?: boolean; rating?: { average: number; count: number } }) {
  const low = product.stock > 0 && product.stock <= 10
  return (
    <li className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg">
      <Link href={`/products/${product.slug}`} className="relative block" aria-label={product.name}>
        <ProductImage name={product.name} imageUrl={product.imageUrl} className="aspect-[4/5]" />
        {low && <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-ink-foreground">Only {product.stock} left</span>}
        {product.stock === 0 && <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-ink-foreground">Sold out</span>}
        <WishlistButton productId={product.id} initial={wished} signedIn={signedIn} className="absolute right-3 top-3" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{categoryLabel(product.category)}</p>
        <Link href={`/products/${product.slug}`} className="mt-1 font-display text-lg font-semibold leading-snug hover:text-primary">{product.name}</Link>
        {rating && rating.count > 0 && <Stars value={rating.average} count={rating.count} className="mt-1" />}
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <p className="mt-auto pt-3 text-lg font-semibold">{formatMoney(product.priceCents, product.currency)}</p>
        <AddToCartButton product={product} />
      </div>
    </li>
  )
}
