import { formatMoney } from '@/lib/money'
import type { Product } from '@/server/db/products'

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock === 0
  return (
    <li className="flex flex-col rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 aspect-square rounded-md bg-background" aria-hidden />
      <p className="text-xs text-muted-foreground">{product.category}</p>
      <h2 className="mt-1 font-semibold">{product.name}</h2>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
      <p className="mt-auto pt-3 font-semibold">
        {formatMoney(product.priceCents, product.currency)}
        {soldOut && <span className="ml-2 text-sm font-normal text-muted-foreground">Sold out</span>}
      </p>
    </li>
  )
}
