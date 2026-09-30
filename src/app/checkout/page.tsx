import type { Metadata } from 'next'
import { CheckoutView } from '@/views/checkout-view'

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } }

export default function Page() {
  return <CheckoutView />
}
