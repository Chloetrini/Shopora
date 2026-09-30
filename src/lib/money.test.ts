import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('formats kobo as naira', () => {
    expect(formatMoney(1800000)).toBe('₦18,000.00')
    expect(formatMoney(5)).toBe('₦0.05')
  })
})
