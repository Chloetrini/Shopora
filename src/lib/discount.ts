/** An order can never be discounted below this (kobo): Paystack needs a real amount to charge. */
export const MIN_TOTAL_CENTS = 5000

export type DiscountRule = { percentOff: number | null; amountOffCents: number | null }

/** The SQL in server/db/orders.ts mirrors this exactly (integer maths, same cap). Change both together. */
export function computeDiscount(subtotalCents: number, rule: DiscountRule): number {
  const raw = rule.percentOff != null ? Math.floor((subtotalCents * rule.percentOff) / 100) : Math.min(rule.amountOffCents ?? 0, subtotalCents)
  return Math.max(0, Math.min(raw, Math.max(subtotalCents - MIN_TOTAL_CENTS, 0)))
}

export const normalizeCode = (s: string): string => s.trim().toUpperCase()
export const CODE_PATTERN = /^[A-Z0-9_-]{3,20}$/

export function describeRule(rule: DiscountRule, formatAmount: (cents: number) => string): string {
  return rule.percentOff != null ? `${rule.percentOff}% off` : `${formatAmount(rule.amountOffCents ?? 0)} off`
}
