'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/use-cart'
import type { Product } from '@/server/db/products'

export function AddToCartButton({ product }: { product: Pick<Product, 'id' | 'name' | 'priceCents' | 'currency' | 'stock'> }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  if (product.stock === 0) {
    return <button disabled className="mt-3 w-full rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground">Sold out</button>
  }
  return (
    <button
      type="button"
      onClick={() => {
        add({ productId: product.id, name: product.name, priceCents: product.priceCents, currency: product.currency })
        setAdded(true)
        setTimeout(() => setAdded(false), 1500)
      }}
      className="mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
    >
      {added ? 'Added to cart' : 'Add to cart'}
    </button>
  )
}
