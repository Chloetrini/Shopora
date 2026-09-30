import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  it('verifies the right password only', async () => {
    const h = await hashPassword('correct horse')
    expect(await verifyPassword('correct horse', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })
  it('a missing hash never verifies', async () => {
    expect(await verifyPassword('anything', null)).toBe(false)
  })
})
