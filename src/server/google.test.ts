import { afterEach, describe, expect, it, vi } from 'vitest'
import { challengeFor, fetchGoogleProfile, googleAuthUrl, newPkce, verifyGoogleIdToken } from './google'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('google helpers', () => {
  it('derives the PKCE challenge per RFC 7636', () => {
    expect(challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
    const p = newPkce()
    expect(p.challenge).toBe(challengeFor(p.verifier))
  })
  it('builds the authorization URL with state, PKCE and the exact redirect URI', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid')
    vi.stubEnv('APP_URL', 'https://shop.test/')
    const u = new URL(googleAuthUrl('st', 'ch'))
    expect(u.searchParams.get('state')).toBe('st')
    expect(u.searchParams.get('code_challenge')).toBe('ch')
    expect(u.searchParams.get('code_challenge_method')).toBe('S256')
    expect(u.searchParams.get('redirect_uri')).toBe('https://shop.test/api/auth/google/callback')
  })
  it('exchanges the code then reads the profile', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'sec')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'tok' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: '1', email: 'a@b.co', email_verified: true, name: 'Ada' })))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchGoogleProfile('code', 'ver')).toEqual({ sub: '1', email: 'a@b.co', email_verified: true, name: 'Ada' })
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get('code_verifier')).toBe('ver')
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer tok')
  })
  it('treats a missing email_verified as unverified and throws on failures', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: '1', email: 'a@b.co' }))))
    expect((await fetchGoogleProfile('c', 'v')).email_verified).toBe(false)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 400 })))
    await expect(fetchGoogleProfile('c', 'v')).rejects.toThrow(/token exchange/)
  })
})

describe('verifyGoogleIdToken (phone app sign-in)', () => {
  const info = (over: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ aud: 'cid', iss: 'https://accounts.google.com', exp: String(Math.floor(Date.now() / 1000) + 600), sub: '42', email: 'a@b.co', email_verified: 'true', name: 'Ada', ...over }))

  it('accepts a token made for our client and returns the profile', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(info()))
    expect(await verifyGoogleIdToken('t'.repeat(30))).toEqual({ sub: '42', email: 'a@b.co', email_verified: true, name: 'Ada' })
  })
  it('refuses a token issued for a different app, a wrong issuer, an expired token, and one Google rejects', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid')
    for (const over of [{ aud: 'someone-else' }, { iss: 'https://evil.example' }, { exp: String(Math.floor(Date.now() / 1000) - 5) }]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(info(over)))
      await expect(verifyGoogleIdToken('t'.repeat(30))).rejects.toThrow()
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 400 })))
    await expect(verifyGoogleIdToken('t'.repeat(30))).rejects.toThrow()
  })
  it('reports an unverified email as unverified', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'cid')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(info({ email_verified: 'false' })))
    expect((await verifyGoogleIdToken('t'.repeat(30))).email_verified).toBe(false)
  })
})
