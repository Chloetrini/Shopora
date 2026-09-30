import 'server-only'
import { randomBytes } from 'node:crypto'
import { siteUrl } from '@/lib/site-url'
import { confirmOrder, getOrderForPayment, setPaymentReference } from './db/orders'
import { decidePayment, orderIdFromReference, type PaymentVerdict } from './payment-rules'
import { initializeTransaction, verifyTransaction } from './paystack'

/** Starts a Paystack payment for a pending order. Null when the order doesn't exist or isn't pending. */
export async function startPayment(orderId: string): Promise<string | null> {
  const reference = `${orderId}-${randomBytes(6).toString('hex')}`
  const order = await setPaymentReference(orderId, reference)
  if (!order) return null
  const init = await initializeTransaction({
    email: order.email,
    amount: order.totalCents,
    currency: order.currency,
    reference,
    callbackUrl: `${siteUrl()}/api/paystack/callback`,
  })
  return init.authorization_url
}

export type FinalizeResult = { orderId: string | null; verdict: PaymentVerdict | 'unknown' }

/**
 * Asks Paystack whether `reference` was paid, then confirms the order if the rules allow.
 * Safe to call repeatedly (callback + webhook race): the update only fires while the order is pending,
 * and `newlyConfirmed` is true for exactly one caller, which is who should send the email (milestone 4).
 */
export async function finalizePayment(reference: string): Promise<FinalizeResult & { newlyConfirmed: boolean }> {
  const orderId = orderIdFromReference(reference)
  if (!orderId) return { orderId: null, verdict: 'unknown', newlyConfirmed: false }
  const order = await getOrderForPayment(orderId)
  if (!order) return { orderId: null, verdict: 'unknown', newlyConfirmed: false }
  const paystack = await verifyTransaction(reference)
  const verdict = decidePayment(order, paystack)
  if (verdict === 'mismatch') {
    console.error('Paystack amount/currency mismatch', { orderId, expected: order.totalCents, got: paystack.amount })
  }
  const newlyConfirmed = verdict === 'confirm' ? await confirmOrder(orderId) : false
  return { orderId, verdict: verdict === 'confirm' && !newlyConfirmed ? 'already_done' : verdict, newlyConfirmed }
}
