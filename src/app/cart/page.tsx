import type { Metadata } from 'next'
import { CartView } from '@/views/cart-view'

export const metadata: Metadata = { title: 'Your cart', robots: { index: false, follow: false } }

export default function Page() {
  return <CartView />
}
