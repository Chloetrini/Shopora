import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  findUserByGoogleId: vi.fn(),
  findUserByEmail: vi.fn(),
  linkGoogle: vi.fn(),
  createUser: vi.fn(),
}))
vi.mock('./db/users', () => db)

import { resolveGoogleUser } from './google-account'

const user = (over = {}) => ({ id: 'u1', email: 'ada@example.com', fullName: 'Ada', passwordHash: 'h', googleId: null, emailVerified: true, sessionVersion: 0, ...over })
const profile = { sub: 'g1', email: 'Ada@Example.com', name: 'Ada L' }

beforeEach(() => {
  vi.resetAllMocks()
  db.findUserByGoogleId.mockResolvedValue(null)
  db.findUserByEmail.mockResolvedValue(null)
})

describe('resolveGoogleUser', () => {
  it('finds a known Google id first, even if the email differs', async () => {
    db.findUserByGoogleId.mockResolvedValue(user({ googleId: 'g1' }))
    await resolveGoogleUser({ ...profile, email: 'new@example.com' })
    expect(db.findUserByEmail).not.toHaveBeenCalled()
    expect(db.createUser).not.toHaveBeenCalled()
  })
  it('links to a verified account and keeps its password', async () => {
    db.findUserByEmail.mockResolvedValue(user({ emailVerified: true }))
    await resolveGoogleUser(profile)
    expect(db.findUserByEmail).toHaveBeenCalledWith('ada@example.com')
    expect(db.linkGoogle).toHaveBeenCalledWith('u1', 'g1', false)
  })
  it('discards the password of an unverified account it links to', async () => {
    db.findUserByEmail.mockResolvedValue(user({ emailVerified: false }))
    await resolveGoogleUser(profile)
    expect(db.linkGoogle).toHaveBeenCalledWith('u1', 'g1', true)
  })
  it('refuses a different Google account on the same email', async () => {
    db.findUserByEmail.mockResolvedValue(user({ googleId: 'other' }))
    await expect(resolveGoogleUser(profile)).rejects.toThrow(/different Google account/)
    expect(db.linkGoogle).not.toHaveBeenCalled()
  })
  it('creates a verified, password-less account for a new email', async () => {
    await resolveGoogleUser(profile)
    expect(db.createUser).toHaveBeenCalledWith({ email: 'ada@example.com', fullName: 'Ada L', passwordHash: null, googleId: 'g1', emailVerified: true })
  })
  it('falls back to the email name when Google gives no name', async () => {
    await resolveGoogleUser({ sub: 'g2', email: 'bob@x.co' })
    expect(db.createUser.mock.calls[0][0].fullName).toBe('bob')
  })
})
