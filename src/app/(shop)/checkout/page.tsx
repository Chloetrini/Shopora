import type { Metadata } from 'next'
import { getSessionUser } from '@/server/current-user'
import { listActiveZones, listAddresses } from '@/server/db/features'
import { paystackTestMode } from '@/server/paystack'
import { CheckoutView } from '@/views/checkout-view'

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } }
// Reads the payment key's mode at request time, so it must not be frozen at build.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getSessionUser()
  return <CheckoutView testMode={paystackTestMode()} defaults={user ? { email: user.email, fullName: user.fullName } : null} addresses={user ? await listAddresses(user.id) : []} zones={await listActiveZones()} />
}
