import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CancelOrderButton } from '@/components/shop/cancel-order-button'
import { OrderTimeline } from '@/components/shop/order-timeline'
import { PayButton } from '@/components/shop/pay-button'
import { STATUS_LABEL } from '@/lib/order-status'
import { formatMoney } from '@/lib/money'
import { getSessionUser } from '@/server/current-user'
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
  const [order, user] = await Promise.all([getOrder(id), getSessionUser()])
  if (!order) notFound()
  const paid = order.status !== 'pending' && order.status !== 'cancelled'
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div>
        <p className="text-sm text-muted-foreground">Order {order.id.slice(0, 8)}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">
          {order.status === 'pending' ? 'Your order is saved' : order.status === 'delivered' ? 'Delivered' : paid ? 'Thank you, we’ve got it' : 'Order cancelled'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {STATUS_LABEL[order.status]}. We’ll email {order.email} as it moves.
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
        {order.status === 'pending' && <CancelOrderButton orderId={order.id} />}
        {order.status === 'cancelled' && order.events.some((e) => e.note?.includes('Refund needed')) && (
          <p role="status" className="mt-3 rounded-xl border border-border bg-primary-soft p-3 text-sm">We received a payment after this order was cancelled. We will refund it, and you will get an email when we do.</p>
        )}

        <h2 className="font-display mt-10 text-xl font-semibold">Tracking</h2>
        <div className="mt-4 rounded-lg border border-border bg-surface p-5">
          <OrderTimeline status={order.status} events={order.events} />
        </div>

        {!user && (
          <div className="mt-8 rounded-lg border border-border bg-primary-soft p-5">
            <p className="font-medium">Keep all your orders in one place</p>
            <p className="mt-1 text-sm text-muted-foreground">Sign in with Google to see this and every order you place with {order.email}. You can always come back to this page using the link in your email.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/login?next=${encodeURIComponent(`/orders/${order.id}`)}`} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Log in</Link>
              <Link href={`/register?next=${encodeURIComponent('/orders')}`} className="rounded-md border border-border px-4 py-2 text-sm font-medium">Create an account</Link>
            </div>
          </div>
        )}
      </div>

      <aside className="h-fit rounded-lg border border-border bg-surface p-5">
        <h2 className="font-semibold">Summary</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {order.items.map((i) => (
            <li key={i.name} className="flex justify-between gap-3 py-2">
              <span>{i.quantity} × {i.name}</span>
              <span>{formatMoney(i.unitPriceCents * i.quantity, order.currency)}</span>
            </li>
          ))}
        </ul>
        {order.deliveryZone && (
          <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
            <span>Delivery ({order.deliveryZone})</span>
            <span>{order.deliveryCents > 0 ? formatMoney(order.deliveryCents, order.currency) : 'Free'}</span>
          </p>
        )}
        {order.discountCents > 0 && (
          <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
            <span>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</span>
            <span>-{formatMoney(order.discountCents, order.currency)}</span>
          </p>
        )}
        <p className="mt-3 flex justify-between border-t border-border pt-3 text-lg font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.totalCents, order.currency)}</span>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Ships to {order.fullName}, {order.address}</p>
      </aside>
    </div>
  )
}
