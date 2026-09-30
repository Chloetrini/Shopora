export type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'

/** Steps shown on the timeline, in order. "confirmed" means the payment was received. */
export const TRACK_STEPS: { status: OrderStatus; label: string; hint: string }[] = [
  { status: 'confirmed', label: 'Payment received', hint: 'We have your payment.' },
  { status: 'processing', label: 'Preparing your order', hint: 'We are packing your items.' },
  { status: 'shipped', label: 'Shipped', hint: 'Your order has left us.' },
  { status: 'out_for_delivery', label: 'Out for delivery', hint: 'It is on its way to you today.' },
  { status: 'delivered', label: 'Delivered', hint: 'Enjoy!' },
]

const PAID: OrderStatus[] = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']

/** True once the payment has been verified (and the order has not been cancelled). */
export const isPaidStatus = (s: string): boolean => (PAID as string[]).includes(s)

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Awaiting payment',
  confirmed: 'Payment received',
  processing: 'Preparing your order',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const isOrderStatus = (s: string): s is OrderStatus => s in STATUS_LABEL

/** Index of the current step on the timeline: -1 before payment, null when cancelled. */
export function stepIndex(status: string): number | null {
  if (status === 'cancelled') return null
  return TRACK_STEPS.findIndex((s) => s.status === status)
}

/** Progress for a bar, 0 to 100. */
export function progressPercent(status: string): number {
  const i = stepIndex(status)
  if (i === null || i < 0) return 0
  return Math.round(((i + 1) / TRACK_STEPS.length) * 100)
}

/**
 * What an admin may do next. Paid orders move forward (skipping steps is fine, backwards is not),
 * and anything not yet delivered can be cancelled. Unpaid orders are changed by payment, not by hand.
 */
export function canTransition(from: string, to: string): boolean {
  if (!isPaidStatus(from) && from !== 'pending') return false // cancelled is final
  if (from === 'pending') return false
  if (to === 'cancelled') return from !== 'delivered'
  const a = PAID.indexOf(from as OrderStatus)
  const b = PAID.indexOf(to as OrderStatus)
  return a >= 0 && b > a
}

/** Statuses that email the buyer. */
export const NOTIFY_STATUSES: OrderStatus[] = ['shipped', 'out_for_delivery', 'delivered', 'cancelled']
