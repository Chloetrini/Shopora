'use client'

import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { cartTotalCents } from '@/lib/cart'
import { formatMoney } from '@/lib/money'

export function CartView() {
  const { cart, setQty, remove } = useCart()
  if (cart.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Your cart</h1>
        <p className="mt-4 text-muted-foreground">Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Browse products</Link>
      </div>
    )
  }
  const currency = cart[0].currency
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Your cart</h1>
      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
        {cart.map((i) => (
          <li key={i.productId} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{i.name}</p>
              <p className="text-sm text-muted-foreground">{formatMoney(i.priceCents, i.currency)} each</p>
            </div>
            <label className="sr-only" htmlFor={`qty-${i.productId}`}>Quantity for {i.name}</label>
            <input
              id={`qty-${i.productId}`}
              type="number"
              min={1}
              max={10}
              value={i.quantity}
              onChange={(e) => setQty(i.productId, Number(e.target.value) || 1)}
              className="w-16 rounded-md border border-border bg-background px-2 py-1"
            />
            <p className="w-20 text-right font-medium">{formatMoney(i.priceCents * i.quantity, i.currency)}</p>
            <button type="button" onClick={() => remove(i.productId)} aria-label={`Remove ${i.name}`} className="rounded-md p-2 text-muted-foreground hover:text-foreground">
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{formatMoney(cartTotalCents(cart), currency)}</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Prices are confirmed again at checkout.</p>
      <Link href="/checkout" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90">Go to checkout</Link>
    </div>
  )
}
