import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatMoney } from '@/lib/money'
import { getOrder } from '@/server/db/orders'

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export const dynamic = 'force-dynamic'

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await getOrder((await params).id)
  if (!order) notFound()
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Thanks, we’ve saved your order</h1>
      <p className="mt-2 text-muted-foreground">
        Order {order.id.slice(0, 8)} for {order.email}. Status: {order.status}. Payment isn’t set up yet, so nothing has been charged.
      </p>
      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-surface">
        {order.items.map((i) => (
          <li key={i.name} className="flex justify-between gap-3 p-4">
            <span>{i.quantity} × {i.name}</span>
            <span>{formatMoney(i.unitPriceCents * i.quantity, order.currency)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex justify-between text-lg font-semibold">
        <span>Total</span>
        <span>{formatMoney(order.totalCents, order.currency)}</span>
      </p>
      <p className="mt-4 text-sm text-muted-foreground">Ships to {order.fullName}, {order.address}</p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Keep shopping</Link>
    </div>
  )
}
