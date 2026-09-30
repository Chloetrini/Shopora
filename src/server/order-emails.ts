import 'server-only'
import { isPaidStatus, type OrderStatus } from '@/lib/order-status'
import { claimConfirmation, getOrder, listUnsentConfirmations, markConfirmationSent, releaseConfirmation } from './db/orders'
import { orderConfirmationEmail, orderStatusEmail } from './email-templates'
import { sendEmail } from './email.service'

/**
 * Sends the confirmation for a PAID order at most once. Only paid orders trigger email, so nobody can make
 * us email a stranger by typing their address at checkout. `confirmation_sent_at` is claimed with a conditional
 * update before sending (two racing callers can't both send) and released if sending fails, so the next
 * callback or webhook retry tries again. Never throws: an email problem must not undo a payment.
 */
export async function sendConfirmationOnce(orderId: string): Promise<void> {
  try {
    if (!(await claimConfirmation(orderId))) return
    try {
      const order = await getOrder(orderId)
      if (!order || !isPaidStatus(order.status)) return await releaseConfirmation(orderId)
      const result = await sendEmail({ to: order.email, ...orderConfirmationEmail(order) })
      // Production without Mailgun keys: nothing was sent, so leave it unclaimed for later.
      if (result === 'skipped') await releaseConfirmation(orderId)
    } catch (e) {
      await releaseConfirmation(orderId).catch(() => {})
      throw e
    }
  } catch (e) {
    console.error('Order confirmation email failed', orderId, e instanceof Error ? e.message : e)
  }
}

/** Emails the buyer about a status change. Never throws: a mail problem must not undo the change. */
export async function sendStatusEmail(orderId: string, status: OrderStatus, note: string | null): Promise<void> {
  try {
    const order = await getOrder(orderId)
    if (!order) return
    await sendEmail({ to: order.email, ...orderStatusEmail(order, status, note) })
  } catch (e) {
    console.error('Order status email failed', orderId, e instanceof Error ? e.message : e)
  }
}

/**
 * Admin tool: send (or resend) the confirmation and TELL the caller what happened, unlike the automatic path,
 * which swallows errors. The message is Mailgun's own reason (status and text); it never contains the API key.
 */
export async function resendConfirmation(orderId: string): Promise<{ ok: true; result: 'sent' | 'logged' | 'skipped' } | { ok: false; error: string }> {
  try {
    const order = await getOrder(orderId)
    if (!order) return { ok: false, error: 'Order not found' }
    if (!isPaidStatus(order.status)) return { ok: false, error: 'Only paid orders get a confirmation email' }
    const result = await sendEmail({ to: order.email, ...orderConfirmationEmail(order) })
    if (result === 'sent') await markConfirmationSent(orderId)
    return { ok: true, result }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Sends every confirmation that never went out, and reports what happened (for the admin button).
 * Errors are summarised, not hidden: the first distinct reasons are returned so the cause is visible.
 */
export async function resendMissingConfirmations(limit = 25): Promise<{ attempted: number; sent: number; failed: number; reasons: string[] }> {
  const orders = await listUnsentConfirmations(limit)
  let sent = 0
  const reasons = new Set<string>()
  for (const o of orders) {
    const r = await resendConfirmation(o.id)
    if (r.ok && r.result === 'sent') sent++
    else reasons.add(r.ok ? 'Email is not configured on this server' : r.error)
  }
  return { attempted: orders.length, sent, failed: orders.length - sent, reasons: [...reasons].slice(0, 3) }
}

/** The cron's quiet version: tries each unsent confirmation once; errors are only logged. */
export async function retryMissingConfirmations(limit = 25): Promise<number> {
  const orders = await listUnsentConfirmations(limit)
  for (const o of orders) await sendConfirmationOnce(o.id)
  return orders.length
}
