import type { Metadata } from 'next'
import { paystackTestMode } from '@/server/paystack'
import { CheckoutView } from '@/views/checkout-view'

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } }
// Reads the payment key's mode at request time, so it must not be frozen at build.
export const dynamic = 'force-dynamic'

export default function Page() {
  return <CheckoutView testMode={paystackTestMode()} />
}
