import { describe, expect, it, vi } from 'vitest'
import { checkMailgun } from './mailgun-check'

const env = { MAILGUN_API_KEY: 'key-SECRET123', MAILGUN_DOMAIN: 'sandbox9975019130844c6995f973d985d8a9a5.mailgun.org', MAILGUN_FROM: 'Shopora <postmaster@sandbox9975019130844c6995f973d985d8a9a5.mailgun.org>' }
const reply = (status: number, body: unknown = {}) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('checkMailgun', () => {
  it('says what is missing when env vars are not set, without calling Mailgun', async () => {
    const f = reply(200)
    const r = await checkMailgun({ MAILGUN_DOMAIN: 'x.mailgun.org' }, f)
    expect(r.hint).toContain('MAILGUN_API_KEY')
    expect(r.hint).toContain('MAILGUN_FROM')
    expect(f).not.toHaveBeenCalled()
  })
  it('explains the sandbox recipient rule for a healthy sandbox domain', async () => {
    const r = await checkMailgun(env, reply(200, { domain: { state: 'active' } }))
    expect(r).toMatchObject({ apiKey: 'valid', domain: 'found', kind: 'sandbox', state: 'active', sender: 'matches the domain' })
    expect(r.hint).toContain('Authorized recipients')
  })
  it('flags a rejected key, a missing domain and a mismatched sender', async () => {
    expect((await checkMailgun(env, reply(401))).apiKey).toBe('rejected')
    expect((await checkMailgun(env, reply(404))).domain).toBe('not found')
    const r = await checkMailgun({ ...env, MAILGUN_FROM: 'Shopora <me@gmail.com>' }, reply(200, { domain: { state: 'active' } }))
    expect(r.sender).toBe('different domain')
    expect(r.hint).toContain('postmaster@')
  })
  it('never includes the key, and survives a network failure', async () => {
    const out = JSON.stringify(await checkMailgun(env, reply(401)))
    expect(out).not.toContain('SECRET123')
    const down = vi.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch
    expect((await checkMailgun(env, down)).hint).toContain('Could not reach')
  })
  it('calls the domain endpoint with basic auth and the EU base when set', async () => {
    const f = reply(200, { domain: { state: 'active' } })
    await checkMailgun({ ...env, MAILGUN_BASE_URL: 'https://api.eu.mailgun.net/' }, f)
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe(`https://api.eu.mailgun.net/v3/domains/${env.MAILGUN_DOMAIN}`)
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from(`api:${env.MAILGUN_API_KEY}`).toString('base64')}`)
  })
})
