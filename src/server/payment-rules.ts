export type PaymentVerdict = 'confirm' | 'already_done' | 'not_paid' | 'mismatch'

/**
 * Whether a Paystack verification lets us mark an order paid. Confirm only when Paystack says
 * `success` AND the amount and currency equal what WE stored for the order; a browser's word,
 * or a payment for a different amount, never counts.
 */
export function decidePayment(
  order: { status: string; totalCents: number; currency: string },
  paystack: { status: string; amount: number; currency: string },
): PaymentVerdict {
  if (order.status === 'confirmed') return 'already_done'
  if (order.status !== 'pending') return 'not_paid'
  if (paystack.status !== 'success') return 'not_paid'
  if (paystack.amount !== order.totalCents || paystack.currency.toUpperCase() !== order.currency.toUpperCase()) {
    return 'mismatch'
  }
  return 'confirm'
}

/** References look like "<order uuid>-<hex>". Returns the order id, or null for anything else. */
export function orderIdFromReference(reference: string): string | null {
  const m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-[0-9a-f]+$/i.exec(reference)
  return m ? m[1].toLowerCase() : null
}
