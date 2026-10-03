'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/use-cart'
import type { Product } from '@/server/db/products'

export function AddToCartButton({ product }: { product: Pick<Product, 'id' | 'name' | 'priceCents' | 'currency' | 'stock'> & Partial<Pick<Product, 'slug' | 'imageUrl'>> }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  if (product.stock === 0) {
    return <button disabled className="w-full rounded-md border border-border px-4 py-2 text-sm text-muted-foreground">Sold out</button>
  }
  return (
    <button
      type="button"
      onClick={() => {
        add({ productId: product.id, name: product.name, priceCents: product.priceCents, currency: product.currency, slug: product.slug, imageUrl: product.imageUrl ?? null })
        setAdded(true)
        setTimeout(() => setAdded(false), 1500)
      }}
      className="w-full rounded-md border border-foreground/20 px-4 py-2 text-sm font-medium hover:border-foreground hover:bg-foreground hover:text-background"
    >
      {added ? 'Added to cart' : 'Add to cart'}
    </button>
  )
}
