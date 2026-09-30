import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmailError, sendEmail } from './email.service'

const msg = { to: 'a@b.co', subject: 'Hi', text: 'text', html: '<p>html</p>' }
const setup = () => {
  vi.stubEnv('MAILGUN_API_KEY', 'key-secret123')
  vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com')
  vi.stubEnv('MAILGUN_FROM', 'Shopora <orders@mg.example.com>')
}
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sendEmail', () => {
  it('posts a form to Mailgun with basic auth', async () => {
    setup()
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"x"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await sendEmail(msg)).toBe('sent')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.mailgun.net/v3/mg.example.com/messages')
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('api:key-secret123').toString('base64')}`)
    const body = init.body as URLSearchParams
    expect(body.get('to')).toBe('a@b.co')
    expect(body.get('from')).toBe('Shopora <orders@mg.example.com>')
    expect(body.get('html')).toBe('<p>html</p>')
  })
  it('uses the EU base URL when configured', async () => {
    setup()
    vi.stubEnv('MAILGUN_BASE_URL', 'https://api.eu.mailgun.net/')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await sendEmail(msg)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.eu.mailgun.net/v3/mg.example.com/messages')
  })
  it('throws Mailgun’s reason but never the key', async () => {
    setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"Sandbox: recipient not authorized"}', { status: 403 })))
    const err = await sendEmail(msg).catch((e) => e)
    expect(err).toBeInstanceOf(EmailError)
    expect(err.message).toContain('403')
    expect(err.message).toContain('recipient not authorized')
    expect(err.message).not.toContain('key-secret123')
  })
  it('prints in development and skips in production when not configured', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'development')
    expect(await sendEmail(msg)).toBe('logged')
    vi.stubEnv('NODE_ENV', 'production')
    expect(await sendEmail(msg)).toBe('skipped')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})


import { emailProviders, parseSender } from './email.service'

const brevoEnv = () => {
  vi.stubEnv('BREVO_API_KEY', 'xkeysib-SECRET')
  vi.stubEnv('BREVO_FROM', 'Shopora <me@example.com>')
}

describe('backup provider', () => {
  it('parses senders', () => {
    expect(parseSender('Shopora <me@example.com>')).toEqual({ name: 'Shopora', email: 'me@example.com' })
    expect(parseSender('me@example.com')).toEqual({ email: 'me@example.com' })
    expect(parseSender('"Shop, Inc" <me@example.com>')).toEqual({ name: 'Shop, Inc', email: 'me@example.com' })
  })
  it('lists only fully configured providers, Mailgun first', () => {
    expect(emailProviders({})).toHaveLength(0)
    expect(emailProviders({ MAILGUN_API_KEY: 'k', MAILGUN_DOMAIN: 'd' })).toHaveLength(0)
    expect(emailProviders({ BREVO_API_KEY: 'k', BREVO_FROM: 'a@b.co' }).map((p) => p.name)).toEqual(['brevo'])
    expect(emailProviders({ MAILGUN_API_KEY: 'k', MAILGUN_DOMAIN: 'd', MAILGUN_FROM: 'f', BREVO_API_KEY: 'k', BREVO_FROM: 'a@b.co' }).map((p) => p.name)).toEqual(['mailgun', 'brevo'])
  })
  it('falls back to Brevo when Mailgun refuses the message', async () => {
    setup()
    brevoEnv()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{"message":"Sandbox: recipient not authorized"}', { status: 403 }))
      .mockResolvedValueOnce(new Response('{"messageId":"x"}', { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await sendEmail(msg)).toBe('sent')
    expect(fetchMock.mock.calls[0][0]).toContain('api.mailgun.net')
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init.headers['api-key']).toBe('xkeysib-SECRET')
    expect(JSON.parse(init.body)).toMatchObject({ sender: { name: 'Shopora', email: 'me@example.com' }, to: [{ email: 'a@b.co' }], subject: 'Hi' })
  })
  it('does not call Brevo when Mailgun succeeds', async () => {
    setup()
    brevoEnv()
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await sendEmail(msg)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('names every provider’s reason when all fail, and never leaks a key', async () => {
    setup()
    brevoEnv()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{"message":"Forbidden"}', { status: 403 }))
      .mockResolvedValueOnce(new Response('{"message":"sender not valid"}', { status: 400 })))
    const err = await sendEmail(msg).catch((e) => e)
    expect(err).toBeInstanceOf(EmailError)
    expect(err.message).toContain('Mailgun responded 403: Forbidden')
    expect(err.message).toContain('Brevo responded 400: sender not valid')
    expect(err.message).not.toMatch(/SECRET|xkeysib/)
  })
  it('works with Brevo alone', async () => {
    brevoEnv()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 201 })))
    expect(await sendEmail(msg)).toBe('sent')
  })
})
