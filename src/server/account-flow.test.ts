import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hashToken } from './tokens'

process.env.SESSION_SECRET = 'z'.repeat(40)
process.env.APP_URL = 'https://shop.example.com'

const sent: { to: string; subject: string; text: string; html: string }[] = []
vi.mock('./email.service', () => ({ sendEmail: async (m: (typeof sent)[number]) => { sent.push(m); return 'sent' } }))

const stored: { userId: string; kind: string; hash: string }[] = []
const consumeVerify = vi.fn(async (hash: string) => (hash === hashToken('good-verify-token-xxxxxxxx') ? 'a@example.com' : null))
const consumeReset = vi.fn(async (hash: string, _pw: string) => (hash === hashToken('good-reset-token-xxxxxxxxx') ? 'a@example.com' : null))
vi.mock('./db/account-tokens', () => ({
  storeToken: async (userId: string, kind: string, hash: string) => { stored.push({ userId, kind, hash }) },
  consumeVerifyToken: (h: string) => consumeVerify(h),
  consumeResetToken: (h: string, p: string) => consumeReset(h, p),
}))

vi.mock('./db/users', async (orig) => ({
  ...(await orig<typeof import('./db/users')>()),
  findUserByEmail: async (e: string) => (e === 'a@example.com' ? { id: 'u1', email: 'a@example.com', fullName: 'Ada Lovelace', passwordHash: null, googleId: null, emailVerified: false, sessionVersion: 0 } : null),
}))

let n = 0
const post = (path: string, body: unknown) =>
  new NextRequest(`http://evil.example${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.1.${Math.floor(n / 250)}.${n++ % 250}` }, body: JSON.stringify(body) })

beforeEach(() => { sent.length = 0; stored.length = 0; consumeVerify.mockClear(); consumeReset.mockClear() })

describe('forgot password', () => {
  it('answers the same for a known and an unknown address, and only emails the known one', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const known = await POST(post('/api/auth/forgot-password', { email: 'a@example.com' }))
    const unknown = await POST(post('/api/auth/forgot-password', { email: 'nobody@example.com' }))
    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(await known.json()).toEqual(await unknown.json())
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe('a@example.com')
  })

  it('builds the link from APP_URL, never from the request host, and stores only a hash', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    await POST(post('/api/auth/forgot-password', { email: 'a@example.com' }))
    const token = /reset-password\?token=([A-Za-z0-9_-]+)/.exec(sent.at(-1)?.text ?? '')?.[1] ?? ''
    expect(sent.at(-1)?.text).toContain('https://shop.example.com/reset-password?token=')
    expect(sent.at(-1)?.text).not.toContain('evil.example')
    expect(token.length).toBeGreaterThan(30)
    expect(stored.at(-1)?.hash).toBe(hashToken(token))
    expect(stored.at(-1)?.hash).not.toContain(token)
  })

  it('stops sending to one address after three in a window, still with the same answer', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    const bodies = []
    for (let i = 0; i < 5; i++) bodies.push(await (await POST(post('/api/auth/forgot-password', { email: 'a@example.com' }))).json())
    expect(new Set(bodies.map((b) => JSON.stringify(b))).size).toBe(1)
    expect(sent.length).toBeLessThan(5)
  })

  it('rejects a malformed address', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route')
    expect((await POST(post('/api/auth/forgot-password', { email: 'not-an-email' }))).status).toBe(400)
  })
})

describe('reset password', () => {
  it('a weak password is refused before the link is touched', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const res = await POST(post('/api/auth/reset-password', { token: 'good-reset-token-xxxxxxxxx', newPassword: 'short' }))
    expect(res.status).toBe(400)
    expect(consumeReset).not.toHaveBeenCalled()
  })
  it('a wrong or used link is a 400 invalid_token', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const res = await POST(post('/api/auth/reset-password', { token: 'wrong-token-wrong-token-1', newPassword: 'a-good-password' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('invalid_token')
  })
  it('a good link sets a hashed password, and sets no cookie', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route')
    const res = await POST(post('/api/auth/reset-password', { token: 'good-reset-token-xxxxxxxxx', newPassword: 'a-good-password' }))
    expect(res.status).toBe(200)
    expect(res.cookies.get('shopora_session')).toBeUndefined()
    const pw = consumeReset.mock.calls[0][1]
    expect(pw).not.toBe('a-good-password')
    expect(pw).toMatch(/^\$2[aby]\$/)
  })
})

describe('verify email', () => {
  it('confirms with a good link and refuses a bad one', async () => {
    const { POST } = await import('@/app/api/auth/verify-email/route')
    expect((await POST(post('/api/auth/verify-email', { token: 'good-verify-token-xxxxxxxx' }))).status).toBe(200)
    expect((await POST(post('/api/auth/verify-email', { token: 'bad-verify-token-xxxxxxxxx' }))).status).toBe(400)
  })
})

describe('emails', () => {
  it('escape a hostile name in the HTML', async () => {
    const { verifyEmailMessage, welcomeEmailMessage, resetPasswordMessage } = await import('./email-templates')
    for (const m of [verifyEmailMessage('<script>alert(1)</script> Bob', 'https://x/y'), welcomeEmailMessage('<script>alert(1)</script> Bob'), resetPasswordMessage('<script>alert(1)</script> Bob', 'https://x/y')]) {
      expect(m.html).not.toContain('<script>')
    }
  })
  it('the sign-up email is a welcome that asks to confirm; the Google one is only a welcome', async () => {
    const { verifyEmailMessage, welcomeEmailMessage } = await import('./email-templates')
    expect(verifyEmailMessage('Ada', 'https://x/y').subject).toMatch(/Welcome.*confirm/i)
    expect(welcomeEmailMessage('Ada').subject).toBe('Welcome to Shopora')
  })
})
