'use client'

import Link from 'next/link'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { ProductImage } from '@/components/shop/product-image'
import { useCart } from '@/hooks/use-cart'
import { cartCount, cartTotalCents } from '@/lib/cart'
import { formatMoney } from '@/lib/money'

/** The cart: lines on the left, a summary that stays in view on the right (below the lines on phones). */
export function CartView() {
  const { cart, setQty, remove } = useCart()

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="font-display mt-6 text-2xl">Your cart is empty</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Add something you like and it will wait for you here. Signed in, it also follows you to the phone app.</p>
        <Link href="/#shop" className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Browse products</Link>
      </div>
    )
  }

  const currency = cart[0].currency
  const count = cartCount(cart)
  return (
    <div>
      <h1 className="font-display text-3xl">Your cart</h1>
      <p className="mt-1 text-sm text-muted-foreground">{count} {count === 1 ? 'item' : 'items'}</p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <ul className="divide-y divide-border border-y border-border">
          {cart.map((i) => (
            <li key={i.productId} className="flex gap-4 py-5 sm:gap-6">
              <div className="w-20 shrink-0 sm:w-28">
                {i.slug ? (
                  <Link href={`/products/${i.slug}`} className="block"><ProductImage name={i.name} imageUrl={i.imageUrl ?? null} className="aspect-[4/5] rounded-md" /></Link>
                ) : (
                  <ProductImage name={i.name} imageUrl={i.imageUrl ?? null} className="aspect-[4/5] rounded-md" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {i.slug ? <Link href={`/products/${i.slug}`} className="text-sm font-medium hover:underline">{i.name}</Link> : <p className="text-sm font-medium">{i.name}</p>}
                    <p className="mt-1 text-sm text-muted-foreground">{formatMoney(i.priceCents, i.currency)} each</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums">{formatMoney(i.priceCents * i.quantity, i.currency)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="inline-flex items-center rounded-md border border-border" role="group" aria-label={`Quantity for ${i.name}`}>
                    <button type="button" onClick={() => setQty(i.productId, i.quantity - 1)} disabled={i.quantity <= 1} aria-label={`One less ${i.name}`} className="grid size-9 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40">
                      <Minus className="size-3.5" aria-hidden />
                    </button>
                    <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{i.quantity}</span>
                    <button type="button" onClick={() => setQty(i.productId, i.quantity + 1)} disabled={i.quantity >= 10} aria-label={`One more ${i.name}`} className="grid size-9 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40">
                      <Plus className="size-3.5" aria-hidden />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(i.productId)} className="text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground">Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="rounded-lg border border-border bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold">Order summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatMoney(cartTotalCents(cart), currency)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd className="text-muted-foreground">Worked out at checkout</dd></div>
          </dl>
          <div className="mt-5 flex justify-between border-t border-border pt-5 text-base font-semibold">
            <span>Total</span><span className="tabular-nums">{formatMoney(cartTotalCents(cart), currency)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Prices are confirmed again at checkout. Discount codes go in there too.</p>
          <Link href="/checkout" className="mt-6 block rounded-md bg-primary px-5 py-3 text-center text-sm font-medium text-primary-foreground hover:opacity-90">Go to checkout</Link>
          <Link href="/#shop" className="mt-3 block text-center text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground">Continue shopping</Link>
        </aside>
      </div>
    </div>
  )
}
