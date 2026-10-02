import { NextRequest } from 'next/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { hashPassword } from './password'

process.env.SESSION_SECRET = 'x'.repeat(40)

// One fake account; the database is replaced so this runs without Neon.
const account = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com', fullName: 'Ada', passwordHash: '', googleId: null, emailVerified: true, sessionVersion: 3 }
vi.mock('./db/users', async (orig) => ({
  ...(await orig<typeof import('./db/users')>()),
  findUserByEmail: async (e: string) => (e === account.email ? account : null),
  findUserById: async (id: string) => (id === account.id ? account : null),
}))

const post = (headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}`, ...headers },
    body: JSON.stringify({ email: 'a@example.com', password: 'correct horse' }),
  })

beforeAll(async () => { account.passwordHash = await hashPassword('correct horse') })

describe('token login for the phone app', () => {
  it('gives the web a cookie and no token', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(post())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(res.cookies.get('shopora_session')?.value).toBeTruthy()
    expect(json.body.token).toBeUndefined()
  })

  it('also gives the app a token, which then identifies the same user', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const res = await POST(post({ 'x-shopora-client': 'mobile' }))
    const { body } = await res.json()
    expect(typeof body.token).toBe('string')

    const { getRequestUser } = await import('./current-user')
    const me = await getRequestUser(new NextRequest('http://localhost/api/cart', { headers: { authorization: `Bearer ${body.token}` } }))
    expect(me?.id).toBe(account.id)
  })

  it('rejects a bad or missing token', async () => {
    const { getRequestUser } = await import('./current-user')
    expect(await getRequestUser(new NextRequest('http://localhost/api/cart', { headers: { authorization: 'Bearer nonsense' } }))).toBeNull()
    expect(await getRequestUser(new NextRequest('http://localhost/api/cart'))).toBeNull()
  })

  it('rejects a token after the session version changes', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const { body } = await (await POST(post({ 'x-shopora-client': 'mobile' }))).json()
    account.sessionVersion++
    const { getRequestUser } = await import('./current-user')
    expect(await getRequestUser(new NextRequest('http://localhost/api/cart', { headers: { authorization: `Bearer ${body.token}` } }))).toBeNull()
    account.sessionVersion--
  })

  it('never reveals the token for a wrong password', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-shopora-client': 'mobile', 'x-forwarded-for': '10.9.9.9' },
      body: JSON.stringify({ email: 'a@example.com', password: 'wrong' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect((await res.json()).body).toBeUndefined()
  })
})
