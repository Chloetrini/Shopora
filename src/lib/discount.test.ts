import { describe, expect, it } from 'vitest'
import { CODE_PATTERN, computeDiscount, MIN_TOTAL_CENTS, normalizeCode } from './discount'

describe('computeDiscount', () => {
  it('takes a percentage, rounding down to a whole kobo', () => {
    expect(computeDiscount(1_000_000, { percentOff: 10, amountOffCents: null })).toBe(100_000)
    expect(computeDiscount(1_999_999, { percentOff: 10, amountOffCents: null })).toBe(199_999)
  })
  it('takes a fixed amount but never more than the subtotal', () => {
    expect(computeDiscount(1_000_000, { percentOff: null, amountOffCents: 250_000 })).toBe(250_000)
    expect(computeDiscount(100_000, { percentOff: null, amountOffCents: 900_000 })).toBe(100_000 - MIN_TOTAL_CENTS)
  })
  it('always leaves the minimum chargeable total', () => {
    expect(computeDiscount(10_000, { percentOff: 90, amountOffCents: null })).toBe(5_000)
    expect(computeDiscount(3_000, { percentOff: 50, amountOffCents: null })).toBe(0)
  })
})

describe('codes', () => {
  it('normalises and validates', () => {
    expect(normalizeCode('  save10 ')).toBe('SAVE10')
    expect(CODE_PATTERN.test('SAVE10')).toBe(true)
    for (const bad of ['ab', 'has space', 'lower', 'WAY-TOO-LONG-CODE-HERE-1', "X'; DROP"]) expect(CODE_PATTERN.test(bad)).toBe(false)
  })
})
