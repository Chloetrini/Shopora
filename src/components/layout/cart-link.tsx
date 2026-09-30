'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { cartCount } from '@/lib/cart'

export function CartLink() {
  const { cart } = useCart()
  const n = cartCount(cart)
  return (
    <Link href="/cart" className="relative inline-flex items-center gap-2 rounded-md px-2 py-1 hover:bg-background" aria-label={`Cart, ${n} ${n === 1 ? 'item' : 'items'}`}>
      <ShoppingCart className="size-5" aria-hidden />
      {n > 0 && <span className="rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground">{n}</span>}
    </Link>
  )
}
