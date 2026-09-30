import { afterEach, describe, expect, it, vi } from 'vitest'
import { challengeFor, fetchGoogleProfile, googleAuthUrl, newPkce } from './google'

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
