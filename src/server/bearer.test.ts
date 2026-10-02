import { describe, expect, it } from 'vitest'
import { bearerToken } from './bearer'

describe('bearerToken', () => {
  it('reads a bearer token', () => expect(bearerToken('Bearer abc.def_1')).toBe('abc.def_1'))
  it('ignores the scheme case', () => expect(bearerToken('bearer xyz')).toBe('xyz'))
  it('rejects other schemes and junk', () => {
    expect(bearerToken('Basic abc')).toBeUndefined()
    expect(bearerToken('Bearer')).toBeUndefined()
    expect(bearerToken('Bearer a b')).toBeUndefined()
    expect(bearerToken(null)).toBeUndefined()
  })
})
