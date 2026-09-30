import 'server-only'
import { isPaidStatus, type OrderStatus } from '@/lib/order-status'
import { claimConfirmation, getOrder, markConfirmationSent, releaseConfirmation } from './db/orders'
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
