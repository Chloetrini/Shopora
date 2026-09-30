import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminTabs } from '@/components/shop/admin-tabs'
import { AdminStatusForm } from '@/components/shop/admin-status-form'
import { formatMoney } from '@/lib/money'
import { STATUS_LABEL } from '@/lib/order-status'
import { getSessionUser } from '@/server/current-user'
import { listOrdersForAdmin } from '@/server/db/orders'

export const metadata: Metadata = { title: 'Manage orders', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const user = await getSessionUser()
  if (!user?.isAdmin) notFound() // not even a hint that this page exists
  const orders = await listOrdersForAdmin()
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Manage orders</h1>
      <p className="mb-5 mt-1 text-muted-foreground">Moving an order forward emails the buyer for shipped, out for delivery, delivered and cancelled.</p>
      <AdminTabs current="/admin/orders" />
      {orders.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No orders yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/orders/${o.id}`} className="font-medium hover:underline">Order {o.id.slice(0, 8)}</Link>
                <span className="flex items-center gap-2">
                  {o.refundNeeded && <span className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-ink-foreground">Paid after cancel: refund needed</span>}
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium">{STATUS_LABEL[o.status]}</span>
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {o.fullName}, {o.email}, {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}, {formatMoney(o.totalCents, o.currency)}
              </p>
              <div className="mt-3"><AdminStatusForm id={o.id} status={o.status} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
