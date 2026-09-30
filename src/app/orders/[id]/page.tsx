import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PayButton } from '@/components/shop/pay-button'
import { formatMoney } from '@/lib/money'
import { getOrder } from '@/server/db/orders'
import { paystackConfigured, paystackTestMode } from '@/server/paystack'

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export const dynamic = 'force-dynamic'

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ payment?: string }>
}) {
  const [{ id }, { payment }] = await Promise.all([params, searchParams])
  const order = await getOrder(id)
  if (!order) notFound()
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">{order.status === 'confirmed' ? 'Payment received. Thank you!' : 'Your order is saved'}</h1>
      <p className="mt-2 text-muted-foreground">
        Order {order.id.slice(0, 8)} for {order.email}. Status: {order.status}.
        {paystackTestMode() && ' Test mode: no real money moved.'}
      </p>
      {order.status === 'pending' && payment === 'failed' && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">The payment didn’t go through. You can try again.</p>
      )}
      {order.status === 'pending' && payment === 'checking' && (
        <p className="mt-3 text-sm">We couldn’t confirm your payment just yet. Refresh in a minute; if you already paid it will update on its own.</p>
      )}
      {order.status === 'pending' &&
        (paystackConfigured() ? (
          <PayButton orderId={order.id} label={payment === 'failed' ? 'Try payment again' : 'Pay now'} />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Payments aren’t set up on this site yet, so nothing has been charged.</p>
        ))}
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
