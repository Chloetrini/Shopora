'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { cartCount } from '@/lib/cart'

export function CartLink() {
  const { cart } = useCart()
  const n = cartCount(cart)
  return (
    <Link href="/cart" aria-label={`Cart, ${n} ${n === 1 ? 'item' : 'items'}`}
      className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground">
      <ShoppingBag className="size-[18px]" aria-hidden />
      {n > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-md bg-primary px-1 text-[11px] font-semibold leading-5 text-primary-foreground">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  )
}
