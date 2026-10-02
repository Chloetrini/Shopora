/** Amounts are minor units (kobo). Format only at the edge. */
export function formatMoney(minor: number, currency = 'NGN'): string {
  const major = (minor / 100).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return currency === 'NGN' ? `₦${major}` : `${currency} ${major}`
}
