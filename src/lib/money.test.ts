import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('formats cents as dollars', () => {
    expect(formatMoney(1800)).toBe('$18.00')
    expect(formatMoney(5)).toBe('$0.05')
  })
})
