import Link from 'next/link'
import { categoryLabel } from '@/lib/catalog'
import { formatMoney } from '@/lib/money'
import type { Product } from '@/server/db/products'
import { AddToCartButton } from './add-to-cart-button'
import { Stars } from './stars'
import { WishlistButton } from './wishlist-button'
import { ProductImage } from './product-image'

/** Flat and quiet: the photo does the work; name and price share a line. */
export function ProductCard({ product, wished = false, signedIn = false, rating }: { product: Product; wished?: boolean; signedIn?: boolean; rating?: { average: number; count: number } }) {
  const low = product.stock > 0 && product.stock <= 10
  return (
    <li className="group flex flex-col">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden rounded-md" aria-label={product.name}>
        <ProductImage name={product.name} imageUrl={product.imageUrl} className="aspect-[4/5]" />
        {low && <span className="absolute left-2.5 top-2.5 rounded-sm bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">Only {product.stock} left</span>}
        {product.stock === 0 && <span className="absolute left-2.5 top-2.5 rounded-sm bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">Sold out</span>}
        <WishlistButton productId={product.id} initial={wished} signedIn={signedIn} className="absolute right-2.5 top-2.5" />
      </Link>
      <div className="mt-3 flex flex-1 flex-col">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <Link href={`/products/${product.slug}`} className="min-w-0 text-sm font-medium leading-snug hover:underline sm:truncate">{product.name}</Link>
          <p className="shrink-0 text-sm tabular-nums">{formatMoney(product.priceCents, product.currency)}</p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{categoryLabel(product.category)}</p>
        {rating && rating.count > 0 && <Stars value={rating.average} count={rating.count} className="mt-1.5" />}
        <div className="mt-auto pt-3"><AddToCartButton product={product} /></div>
      </div>
    </li>
  )
}
