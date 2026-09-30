import { SITE } from '@/constants/site'
import { formatMoney } from '@/lib/money'
import { siteUrl } from '@/lib/site-url'
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
