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
    ...(order.discountCents > 0 ? [`Discount${order.discountCode ? ` (${order.discountCode})` : ''}: -${formatMoney(order.discountCents, order.currency)}`] : []),
    ...(order.deliveryCents > 0 ? [`Delivery${order.deliveryZone ? ` (${order.deliveryZone})` : ''}: ${formatMoney(order.deliveryCents, order.currency)}`] : order.deliveryZone ? [`Delivery (${order.deliveryZone}): Free`] : []),
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
${order.discountCents > 0 ? `<tr><td style="padding:6px 0;border-bottom:1px solid #e4e0d6">Discount${order.discountCode ? ` (${escapeHtml(order.discountCode)})` : ''}</td><td style="padding:6px 0;border-bottom:1px solid #e4e0d6;text-align:right">-${escapeHtml(formatMoney(order.discountCents, order.currency))}</td></tr>` : ''}
${order.deliveryZone ? `<tr><td style="padding:6px 0;border-bottom:1px solid #e4e0d6">Delivery (${escapeHtml(order.deliveryZone)})</td><td style="padding:6px 0;border-bottom:1px solid #e4e0d6;text-align:right">${order.deliveryCents > 0 ? escapeHtml(formatMoney(order.deliveryCents, order.currency)) : 'Free'}</td></tr>` : ''}
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

export function backInStockEmail(name: string, slug: string) {
  const link = `${siteUrl()}/products/${encodeURIComponent(slug)}`
  const text = [`Good news: ${name} is back in stock.`, '', `Get it here: ${link}`, '', 'You asked us to tell you, so this is the only email about it.'].join('\n')
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#14171f;max-width:520px;margin:0 auto;padding:16px">
<h1 style="font-size:20px">${escapeHtml(name)} is back in stock</h1>
<p>You asked us to tell you when it returned. It may sell out again, so grab it while you can.</p>
<p><a href="${escapeHtml(link)}">View ${escapeHtml(name)}</a></p>
</body></html>`
  return { subject: `${name} is back in stock at ${SITE.name}`, text, html }
}

export function lowStockEmail(items: { name: string; stock: number }[]) {
  const lines = items.map((i) => `${i.name}: ${i.stock} left`)
  const link = `${siteUrl()}/admin/products`
  const text = ['These products are running low:', '', ...lines, '', `Restock them: ${link}`].join('\n')
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#14171f;max-width:520px;margin:0 auto;padding:16px">
<h1 style="font-size:20px">Running low</h1>
<ul>${items.map((i) => `<li>${escapeHtml(i.name)}: <strong>${i.stock}</strong> left</li>`).join('')}</ul>
<p><a href="${escapeHtml(link)}">Manage stock</a></p>
</body></html>`
  return { subject: `Low stock: ${items.map((i) => i.name).join(', ')}`.slice(0, 120), text, html }
}

/* ---------- Account emails ---------- */

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="background:#0b6b63;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:600">${escapeHtml(label)}</a></p>`

const shell = (title: string, body: string) =>
  `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#1f2430;max-width:520px;margin:0 auto;padding:16px"><h1 style="font-size:22px">${title}</h1>${body}</body></html>`

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || 'there'

/** Sign-up with email and password: a welcome that asks them to confirm the address. The name is escaped in the HTML. */
export function verifyEmailMessage(fullName: string, link: string) {
  const name = firstName(fullName)
  const text = [
    `Hi ${name},`,
    '',
    `Welcome to ${SITE.name}! Please confirm your email address so we know it's really you.`,
    '',
    `Confirm your email: ${link}`,
    '',
    'This link works once and expires in 24 hours. If you didn’t create an account, you can ignore this email.',
  ].join('\n')
  const html = shell(`Welcome to ${SITE.name}, ${escapeHtml(name)}`, `<p>Please confirm your email address so we know it's really you.</p>${button(link, 'Confirm your email')}<p style="color:#5d6775;font-size:13px">This link works once and expires in 24 hours. If you didn’t create an account, you can ignore this email.</p>`)
  return { subject: `Welcome to ${SITE.name}: confirm your email`, text, html }
}

/** Sign-up with Google: the address is already verified, so this is only a welcome. */
export function welcomeEmailMessage(fullName: string) {
  const name = firstName(fullName)
  const link = siteUrl()
  const text = [`Hi ${name},`, '', `Welcome to ${SITE.name}! Your account is ready.`, 'Browse the shop, keep your cart on the website and the app, and track every order.', '', link].join('\n')
  const html = shell(`Welcome to ${SITE.name}, ${escapeHtml(name)}`, `<p>Your account is ready. Browse the shop, keep your cart on the website and the app, and track every order.</p>${button(link, 'Start shopping')}`)
  return { subject: `Welcome to ${SITE.name}`, text, html }
}

export function resetPasswordMessage(fullName: string, link: string) {
  const name = firstName(fullName)
  const text = [
    `Hi ${name},`,
    '',
    `Someone asked to reset the password for your ${SITE.name} account. To choose a new one, open this link:`,
    link,
    '',
    'It works once and expires in 30 minutes. If it wasn’t you, ignore this email and your password stays as it is.',
  ].join('\n')
  const html = shell('Reset your password', `<p>Hi ${escapeHtml(name)}, someone asked to reset the password for your ${escapeHtml(SITE.name)} account.</p>${button(link, 'Choose a new password')}<p style="color:#5d6775;font-size:13px">It works once and expires in 30 minutes. If it wasn’t you, ignore this email and your password stays as it is.</p>`)
  return { subject: `Reset your ${SITE.name} password`, text, html }
}
