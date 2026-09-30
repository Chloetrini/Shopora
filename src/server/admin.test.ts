import { describe, expect, it } from 'vitest'
import { adminEmails, isAdminUser } from './admin'

const env = { ADMIN_EMAILS: ' Boss@Example.com , second@example.com ' }

describe('admin check', () => {
  it('parses the list', () => expect(adminEmails(env)).toEqual(['boss@example.com', 'second@example.com']))
  it('is nobody when the list is empty', () => {
    expect(adminEmails({})).toEqual([])
    expect(isAdminUser({ email: 'boss@example.com', emailVerified: true }, {})).toBe(false)
  })
  it('needs a listed AND verified email', () => {
    expect(isAdminUser({ email: 'BOSS@example.com', emailVerified: true }, env)).toBe(true)
    expect(isAdminUser({ email: 'boss@example.com', emailVerified: false }, env)).toBe(false)
    expect(isAdminUser({ email: 'other@example.com', emailVerified: true }, env)).toBe(false)
  })
})
