import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
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
      <h1 className="text-2xl font-semibold">My orders</h1>
      {orders.length === 0 ? (
        <p className="mt-4 text-muted-foreground">You haven’t placed an order yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-background">
                <span>
                  <span className="block font-medium">Order {o.id.slice(0, 8)}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium', timeZone: 'UTC' })}, {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}, {o.status}
                  </span>
                </span>
                <span className="font-medium">{formatMoney(o.totalCents, o.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
