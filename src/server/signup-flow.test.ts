import { NextRequest, type NextResponse } from 'next/server'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashPassword } from './password'
import { hashToken } from './tokens'

process.env.SESSION_SECRET = 's'.repeat(40)
process.env.APP_URL = 'https://shop.example.com'

type Rec = { id: string; email: string; fullName: string; passwordHash: string | null; googleId: string | null; emailVerified: boolean; sessionVersion: number; phone: null; avatarV: null }
const rec = (over: Partial<Rec>): Rec => ({ id: 'u1', email: 'new@example.com', fullName: 'New Person', passwordHash: 'x', googleId: null, emailVerified: false, sessionVersion: 0, phone: null, avatarV: null, ...over })

const sent: { to: string; subject: string; text: string }[] = []
vi.mock('./email.service', () => ({ sendEmail: async (m: (typeof sent)[number]) => { sent.push(m); return 'sent' } }))
vi.mock('./db/account-tokens', () => ({
  storeToken: async () => {},
  consumeVerifyToken: async (hash: string) => (hash === hashToken('good-verify-token-xxxxxxxx') ? { id: 'u1', email: 'new@example.com', fullName: 'New Person', sessionVersion: 0 } : null),
  consumeResetToken: async () => null,
}))

let existing: Rec | null = null
let reclaimed: Rec | null = null
const created: Rec[] = []
vi.mock('./db/users', async (orig) => ({
  ...(await orig<typeof import('./db/users')>()),
  findUserByEmail: async () => existing,
  createUser: async (u: { email: string; fullName: string; emailVerified: boolean }) => { const r = rec({ email: u.email, fullName: u.fullName, emailVerified: u.emailVerified }); created.push(r); return r },
  reclaimUnverified: async () => reclaimed,
}))

let n = 0
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.3.${Math.floor(n / 250)}.${n++ % 250}`, ...headers }, body: JSON.stringify(body) })
const as = async (p: Promise<Response | undefined>) => (await p) as NextResponse

let goodHash = ''
beforeAll(async () => { goodHash = await hashPassword('correct horse 1') })
beforeEach(() => { sent.length = 0; created.length = 0; existing = null; reclaimed = null })

describe('signing up with email and password', () => {
  it('creates the account, sends the confirm email, and signs nobody in', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    const res = await as(POST(post('/api/auth/register', { fullName: 'New Person', email: 'new@example.com', password: 'correct horse 1' }, { 'x-shopora-client': 'mobile' })))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(res.cookies.get('shopora_session')).toBeUndefined()
    expect(json.body.token).toBeUndefined()
    expect(json.body.user).toBeUndefined()
    expect(created[0].emailVerified).toBe(false)
    expect(sent).toHaveLength(1)
    expect(sent[0].subject).toMatch(/confirm your email/i)
    expect(sent[0].text).toContain('https://shop.example.com/verify-email?token=')
  })

  it('a confirmed account (or a Google one) cannot be taken over by registering its email', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    existing = rec({ emailVerified: true })
    reclaimed = null
    const res = await as(POST(post('/api/auth/register', { fullName: 'Thief', email: 'new@example.com', password: 'correct horse 1' })))
    expect(res.status).toBe(409)
    expect(sent).toHaveLength(0)
  })

  it('an account that never confirmed is taken over by the new sign-up, which gets the email', async () => {
    const { POST } = await import('@/app/api/auth/register/route')
    existing = rec({ emailVerified: false })
    reclaimed = rec({ emailVerified: false, fullName: 'Real Owner' })
    const res = await as(POST(post('/api/auth/register', { fullName: 'Real Owner', email: 'new@example.com', password: 'correct horse 1' })))
    expect(res.status).toBe(201)
    expect(sent).toHaveLength(1)
  })
})

describe('logging in before confirming the email', () => {
  it('is refused with a clear code, but only after the password is right', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    existing = rec({ emailVerified: false, passwordHash: goodHash })
    const right = await as(POST(post('/api/auth/login', { email: 'new@example.com', password: 'correct horse 1' })))
    expect(right.status).toBe(403)
    expect((await right.json()).code).toBe('email_not_verified')
    expect(right.cookies.get('shopora_session')).toBeUndefined()
    const wrong = await as(POST(post('/api/auth/login', { email: 'new@example.com', password: 'nope-nope-nope' })))
    expect(wrong.status).toBe(401) // no hint that the account exists
    expect((await wrong.json()).code).toBeUndefined()
  })

  it('a confirmed account logs in as before', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    existing = rec({ emailVerified: true, passwordHash: goodHash })
    const res = await as(POST(post('/api/auth/login', { email: 'new@example.com', password: 'correct horse 1' })))
    expect(res.status).toBe(200)
    expect(res.cookies.get('shopora_session')?.value).toBeTruthy()
  })
})

describe('the confirm link', () => {
  it('logs the person in, sets the welcome cookie, and sends the welcome email once', async () => {
    const { POST } = await import('@/app/api/auth/verify-email/route')
    const res = await as(POST(post('/api/auth/verify-email', { token: 'good-verify-token-xxxxxxxx' })))
    expect(res.status).toBe(200)
    expect(res.cookies.get('shopora_session')?.value).toBeTruthy()
    expect(res.cookies.get('shopora_welcome')?.value).toBe('New')
    expect(sent).toHaveLength(1)
    expect(sent[0].subject).toBe('Welcome to Shopora')
    const used = await as(POST(post('/api/auth/verify-email', { token: 'used-or-wrong-token-xxxxxx' })))
    expect(used.status).toBe(400)
    expect(used.cookies.get('shopora_session')).toBeUndefined()
    expect(sent).toHaveLength(1)
  })
  it('gives the phone app a token too', async () => {
    const { POST } = await import('@/app/api/auth/verify-email/route')
    const res = await as(POST(post('/api/auth/verify-email', { token: 'good-verify-token-xxxxxxxx' }, { 'x-shopora-client': 'mobile' })))
    expect(typeof (await res.json()).body.token).toBe('string')
  })
})

describe('resend (not signed in)', () => {
  it('answers the same for every address and only emails an unconfirmed password account', async () => {
    const { POST } = await import('@/app/api/auth/resend-verification/route')
    existing = rec({ emailVerified: false, passwordHash: goodHash })
    const a = await as(POST(post('/api/auth/resend-verification', { email: 'new@example.com' })))
    expect(sent).toHaveLength(1)
    existing = null
    const b = await as(POST(post('/api/auth/resend-verification', { email: 'nobody@example.com' })))
    expect(await a.json()).toEqual(await b.json())
    existing = rec({ emailVerified: true })
    await POST(post('/api/auth/resend-verification', { email: 'done@example.com' }))
    expect(sent).toHaveLength(1)
  })
})
