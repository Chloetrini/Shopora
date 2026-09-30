import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sealOAuth, sealSession, unsealOAuth, unsealSession } from './session'

beforeEach(() => vi.stubEnv('SESSION_SECRET', 'a'.repeat(40)))
afterEach(() => vi.unstubAllEnvs())

describe('session cookie', () => {
  it('round-trips', async () => {
    expect(await unsealSession(await sealSession({ uid: 'u1', v: 2 }))).toEqual({ uid: 'u1', v: 2 })
  })
  it('rejects tampered, garbage and missing cookies', async () => {
    const sealed = await sealSession({ uid: 'u1', v: 0 })
    expect(await unsealSession(sealed.slice(0, -3) + 'abc')).toBeNull()
    expect(await unsealSession('not-a-cookie')).toBeNull()
    expect(await unsealSession(undefined)).toBeNull()
  })
  it('rejects a cookie sealed with another secret', async () => {
    const sealed = await sealSession({ uid: 'u1', v: 0 })
    vi.stubEnv('SESSION_SECRET', 'b'.repeat(40))
    expect(await unsealSession(sealed)).toBeNull()
  })
  it('refuses a short secret when sealing', async () => {
    vi.stubEnv('SESSION_SECRET', 'short')
    await expect(sealSession({ uid: 'u', v: 0 })).rejects.toThrow(/SESSION_SECRET/)
  })
  it('OAuth state round-trips and is not a session', async () => {
    const sealed = await sealOAuth({ state: 's', verifier: 'v', next: '/orders' })
    expect(await unsealOAuth(sealed)).toEqual({ state: 's', verifier: 'v', next: '/orders' })
    expect(await unsealSession(sealed)).toBeNull()
  })
})
