import { beforeEach, describe, expect, it } from 'vitest'
import { allow, resetRateLimits } from './rate-limit'

beforeEach(resetRateLimits)

describe('allow', () => {
  it('blocks after the limit and resets after the window', () => {
    for (let i = 0; i < 3; i++) expect(allow('ip', 3, 1000, 0)).toBe(true)
    expect(allow('ip', 3, 1000, 10)).toBe(false)
    expect(allow('other', 3, 1000, 10)).toBe(true)
    expect(allow('ip', 3, 1000, 1001)).toBe(true)
  })
})
