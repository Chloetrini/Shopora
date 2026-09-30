import 'server-only'
import { claimConfirmation, getOrder, releaseConfirmation } from './db/orders'
import { orderConfirmationEmail } from './email-templates'
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
      if (!order || order.status !== 'confirmed') return await releaseConfirmation(orderId)
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
