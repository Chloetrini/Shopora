import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-next'

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/orders')).toBe('/orders')
    expect(safeNextPath('/checkout?x=1')).toBe('/checkout?x=1')
  })
  it('rejects external and tricky targets', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '', null, undefined, '/a\nb']) {
      expect(safeNextPath(bad as string | null)).toBe('/')
    }
  })
})
