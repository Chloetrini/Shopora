import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { progressPercent, STATUS_LABEL } from '@/lib/order-status'
import { formatMoney } from '@/lib/money'
import { getSessionUser } from '@/server/current-user'
import { listOrdersForUser } from '@/server/db/orders'

export const metadata: Metadata = { title: 'My orders', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login?next=/orders')
  const orders = await listOrdersForUser(user.id)
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">My orders</h1>
      <p className="mt-1 text-muted-foreground">Signed in orders update here as they move.</p>
      {orders.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-medium">You haven’t placed an order yet.</p>
          <Link href="/#shop" className="mt-3 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="block rounded-lg border border-border bg-surface p-4 hover:border-primary">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">Order {o.id.slice(0, 8)}</span>
                  <span className="font-semibold">{formatMoney(o.totalCents, o.currency)}</span>
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium', timeZone: 'UTC' })}, {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                </span>
                <span className="mt-3 flex items-center gap-3">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={progressPercent(o.status)} aria-valuemin={0} aria-valuemax={100} aria-label="Delivery progress">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${progressPercent(o.status)}%` }} />
                  </span>
                  <span className="text-sm">{STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] ?? o.status}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
