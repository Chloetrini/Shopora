import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AddressManager } from '@/components/shop/address-manager'
import { getSessionUser } from '@/server/current-user'
import { listAddresses } from '@/server/db/features'

export const metadata: Metadata = { title: 'Saved addresses', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function AddressesPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/addresses')
  const addresses = await listAddresses(user.id)
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Saved addresses</h1>
      <p className="mb-6 mt-1 text-muted-foreground">Save up to five. Checkout can fill them in for you.</p>
      <AddressManager addresses={addresses} />
    </div>
  )
}
