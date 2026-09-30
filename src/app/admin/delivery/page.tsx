import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminTabs } from '@/components/shop/admin-tabs'
import { ZoneForm, ZoneRow } from '@/components/shop/admin-forms'
import { titleCase } from '@/lib/delivery'
import { getSessionUser } from '@/server/current-user'
import { listAllZones } from '@/server/db/features'

export const metadata: Metadata = { title: 'Delivery zones', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function AdminDeliveryPage() {
  const user = await getSessionUser()
  if (!user?.isAdmin) notFound()
  const zones = await listAllZones()
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Delivery zones</h1>
      <p className="mb-5 mt-1 text-muted-foreground">The fee is added at checkout by the buyer’s country and state. We use the most specific match: state, then the whole country, then “everywhere else” (country *). No matching zone means we don’t deliver there.</p>
      <AdminTabs current="/admin/delivery" />
      <ZoneForm />
      <ul className="mt-6 space-y-3">
        {zones.map((z) => (
          <li key={z.id} className="rounded-2xl border border-border bg-surface p-4">
            <p className="font-medium">{z.name} {!z.active && <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs">Off</span>}</p>
            <p className="mb-2 text-sm text-muted-foreground">
              {z.country === '*' ? 'Everywhere else' : z.region ? `${titleCase(z.region)}, ${titleCase(z.country)}` : `All of ${titleCase(z.country)} not matched above`}
            </p>
            <ZoneRow id={z.id} feeNaira={z.feeCents / 100} freeOverNaira={z.freeOverCents != null ? z.freeOverCents / 100 : null} active={z.active} />
          </li>
        ))}
      </ul>
    </div>
  )
}
