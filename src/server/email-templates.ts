import { SITE } from '@/constants/site'
import { formatMoney } from '@/lib/money'
import { siteUrl } from '@/lib/site-url'
import type { OrderStatus } from '@/lib/order-status'
import type { OrderView } from './db/orders'

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Every value that came from a person (name, address, item names) is escaped in the HTML part. */
export function orderConfirmationEmail(order: OrderView) {
  const ref = order.id.slice(0, 8)
  const link = `${siteUrl()}/orders/${order.id}`
  const total = formatMoney(order.totalCents, order.currency)
  const lines = order.items.map((i) => ({
    label: `${i.quantity} × ${i.name}`,
    amount: formatMoney(i.unitPriceCents * i.quantity, order.currency),
  }))

  const text = [
    `Hi ${order.fullName},`,
    '',
    `Thanks for your order at ${SITE.name}. We've received your payment.`,
    '',
    `Order ${ref}`,
    ...lines.map((l) => `${l.label}: ${l.amount}`),
    `Total: ${total}`,
    '',
    `Shipping to: ${order.address}`,
    '',
    `View your order: ${link}`,
  ].join('\n')

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1f2430;max-width:520px;margin:0 auto;padding:16px">
<h1 style="font-size:20px">Thanks for your order, ${escapeHtml(order.fullName)}</h1>
<p>We've received your payment. Order <strong>${escapeHtml(ref)}</strong>.</p>
<table style="width:100%;border-collapse:collapse">
${lines.map((l) => `<tr><td style="padding:6px 0;border-bottom:1px solid #e4e0d6">${escapeHtml(l.label)}</td><td style="padding:6px 0;border-bottom:1px solid #e4e0d6;text-align:right">${escapeHtml(l.amount)}</td></tr>`).join('\n')}
<tr><td style="padding:8px 0"><strong>Total</strong></td><td style="padding:8px 0;text-align:right"><strong>${escapeHtml(total)}</strong></td></tr>
</table>
<p>Shipping to: ${escapeHtml(order.address)}</p>
<p><a href="${escapeHtml(link)}">View your order</a></p>
</body></html>`

  return { subject: `Your ${SITE.name} order ${ref} is confirmed`, text, html }
}

const STATUS_COPY: Partial<Record<OrderStatus, { subject: string; headline: string; body: string }>> = {
  shipped: { subject: 'is on its way', headline: 'Your order has shipped', body: 'Your order has left us and is on its way to you.' },
  out_for_delivery: { subject: 'is out for delivery', headline: 'Out for delivery', body: 'Your order is out for delivery and should reach you today.' },
  delivered: { subject: 'has been delivered', headline: 'Delivered', body: 'Your order has been delivered. We hope you love it.' },
  cancelled: { subject: 'was cancelled', headline: 'Your order was cancelled', body: 'Your order has been cancelled. If you were charged, we will refund you and let you know.' },
}

/** A short status update. `note` is free text typed by an admin, so it is escaped in the HTML part. */
export function orderStatusEmail(order: OrderView, status: OrderStatus, note: string | null) {
  const copy = STATUS_COPY[status] ?? { subject: 'has an update', headline: 'Order update', body: 'There is an update on your order.' }
  const ref = order.id.slice(0, 8)
  const link = `${siteUrl()}/orders/${order.id}`
  const text = [`Hi ${order.fullName},`, '', copy.body, ...(note ? ['', `Note: ${note}`] : []), '', `Order ${ref}`, `Track it: ${link}`].join('\n')
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#14171f;max-width:520px;margin:0 auto;padding:16px">
<h1 style="font-size:20px">${escapeHtml(copy.headline)}</h1>
<p>Hi ${escapeHtml(order.fullName)}, ${escapeHtml(copy.body)}</p>
${note ? `<p style="background:#f1f5f4;padding:10px;border-radius:6px">${escapeHtml(note)}</p>` : ''}
<p>Order <strong>${escapeHtml(ref)}</strong></p>
<p><a href="${escapeHtml(link)}">Track your order</a></p>
</body></html>`
  return { subject: `Your ${SITE.name} order ${ref} ${copy.subject}`, text, html }
}
