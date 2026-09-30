import { describe, expect, it } from 'vitest'
import { deliveryFee, normalizeLocation, pickZone, type Zone } from './delivery'

const z = (id: string, country: string, region: string | null, feeCents: number, freeOverCents: number | null = null, active = true): Zone =>
  ({ id, name: id, country, region, feeCents, freeOverCents, active })

const zones = [
  z('lagos', 'nigeria', 'lagos', 250000, 5000000),
  z('abuja', 'nigeria', 'abuja', 350000),
  z('ng-other', 'nigeria', null, 450000, 10000000),
  z('world', '*', null, 2500000),
]

describe('normalizeLocation', () => {
  it('makes spellings of a place equal', () => {
    expect(normalizeLocation('  Lagos   State ')).toBe('lagos')
    expect(normalizeLocation('NG')).toBe('nigeria')
    expect(normalizeLocation('FCT')).toBe('abuja')
    expect(normalizeLocation('Federal Capital Territory')).toBe('abuja')
    expect(normalizeLocation(null)).toBe('')
  })
})

describe('pickZone', () => {
  it('prefers the exact region, then the country, then everywhere else', () => {
    expect(pickZone(zones, 'Nigeria', 'Lagos State')?.id).toBe('lagos')
    expect(pickZone(zones, 'ng', 'Kano')?.id).toBe('ng-other')
    expect(pickZone(zones, 'Nigeria', '')?.id).toBe('ng-other')
    expect(pickZone(zones, 'Ghana', 'Accra')?.id).toBe('world')
  })
  it('ignores inactive zones and returns null when nothing matches', () => {
    expect(pickZone([z('lagos', 'nigeria', 'lagos', 1, null, false), ...zones.slice(2)], 'Nigeria', 'Lagos')?.id).toBe('ng-other')
    expect(pickZone(zones.slice(0, 2), 'Ghana', '')).toBeNull()
  })
})

describe('deliveryFee', () => {
  it('is free once the goods reach the threshold, after discounts', () => {
    expect(deliveryFee(zones[0], 4_999_999)).toBe(250000)
    expect(deliveryFee(zones[0], 5_000_000)).toBe(0)
    expect(deliveryFee(zones[1], 999_999_999)).toBe(350000) // no threshold on this zone
  })
})
