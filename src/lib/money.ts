/** Amounts are integers in the smallest unit (kobo for NGN); only format at the edge. */
export function formatMoney(minorUnits: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(minorUnits / 100)
}
