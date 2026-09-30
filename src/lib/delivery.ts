export type Zone = { id: string; name: string; country: string; region: string | null; feeCents: number; freeOverCents: number | null; active: boolean }

const ALIASES: Record<string, string> = {
  ng: 'nigeria', nga: 'nigeria', 'federal republic of nigeria': 'nigeria',
  fct: 'abuja', 'fct abuja': 'abuja', 'abuja fct': 'abuja', 'federal capital territory': 'abuja', 'abuja (fct)': 'abuja',
}

/**
 * "  Lagos State " and "lagos" are the same place. Lower-case, collapse spaces, drop a trailing " state",
 * and map a few well known aliases (NG, FCT). Used for zones AND for what the buyer typed.
 */
export function normalizeLocation(s: string | null | undefined): string {
  const t = (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/ state$/, '')
  return ALIASES[t] ?? t
}

/** The SQL in server/db/orders.ts mirrors this order: exact region, then country-wide, then "*". */
export function pickZone(zones: Zone[], country: string, region: string): Zone | null {
  const c = normalizeLocation(country)
  const r = normalizeLocation(region)
  const live = zones.filter((z) => z.active)
  return (
    (r ? live.find((z) => z.country === c && z.region === r) : undefined) ??
    live.find((z) => z.country === c && z.region === null) ??
    live.find((z) => z.country === '*' && z.region === null) ??
    null
  )
}

/** Free delivery is judged on the goods total AFTER any discount. */
export function deliveryFee(zone: Zone, goodsAfterDiscountCents: number): number {
  return zone.freeOverCents != null && goodsAfterDiscountCents >= zone.freeOverCents ? 0 : zone.feeCents
}

export const titleCase = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase())
