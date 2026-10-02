import { NextRequest, type NextResponse } from 'next/server'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashPassword } from './password'

process.env.SESSION_SECRET = 'p'.repeat(40)

type Rec = { id: string; email: string; fullName: string; passwordHash: string | null; googleId: string | null; emailVerified: boolean; sessionVersion: number; phone: string | null; avatarV: number | null }
let signedIn: Rec | null
let db: Rec
const calls = { deleted: [] as string[], avatars: [] as string[], profile: [] as unknown[], passwords: [] as string[] }

vi.mock('./current-user', () => ({
  getRequestUser: async () => (signedIn ? { id: signedIn.id, email: signedIn.email, fullName: signedIn.fullName, isAdmin: false, emailVerified: true, phone: null, avatarUrl: null, hasPassword: !!signedIn.passwordHash, googleLinked: false } : null),
  getSessionUser: async () => null,
}))
vi.mock('./db/users', async (orig) => ({
  ...(await orig<typeof import('./db/users')>()),
  findUserById: async () => db,
  updateProfile: async (_id: string, patch: unknown) => { calls.profile.push(patch); return { ...db, ...(patch as object) } },
  saveAvatar: async (_id: string, b64: string) => { calls.avatars.push(b64); db = { ...db, avatarV: 123 } },
  clearAvatar: async () => { db = { ...db, avatarV: null } },
  loadAvatar: async () => (db.avatarV ? { bytes: Buffer.from([0xff, 0xd8, 0xff, 1]), type: 'image/jpeg' } : null),
  changePassword: async (_id: string, hash: string) => { calls.passwords.push(hash); return db.sessionVersion + 1 },
  deleteUser: async (id: string) => { calls.deleted.push(id) },
}))

type Handler = (r: NextRequest) => Promise<Response | undefined>
/** The route helpers can in theory return undefined; for these tests they always answer. */
const strict = (h: Handler) => async (r: NextRequest) => (await h(r)) as NextResponse

let n = 0
const req = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}, raw?: Uint8Array) =>
  new NextRequest(`http://localhost${path}`, {
    method, headers: { 'content-type': raw ? 'application/octet-stream' : 'application/json', 'x-forwarded-for': `10.2.${Math.floor(n / 250)}.${n++ % 250}`, ...headers },
    body: raw ? new Blob([raw as BlobPart]) : body === undefined ? undefined : JSON.stringify(body),
  })

beforeAll(async () => {
  db = { id: 'u1', email: 'a@example.com', fullName: 'Ada', passwordHash: await hashPassword('old-password-1'), googleId: null, emailVerified: true, sessionVersion: 1, phone: null, avatarV: null }
})
beforeEach(() => { signedIn = db; calls.deleted.length = calls.avatars.length = calls.profile.length = calls.passwords.length = 0 })

describe('signed out', () => {
  it('every profile endpoint says 401', async () => {
    signedIn = null
    const me = await import('@/app/api/users/me/route')
    const pw = await import('@/app/api/users/me/password/route')
    const av = await import('@/app/api/users/me/avatar/route')
    const answers = await Promise.all([
      strict(me.PATCH)(req('/api/users/me', 'PATCH', { fullName: 'X' })), strict(me.DELETE)(req('/api/users/me', 'DELETE', { password: 'x' })),
      strict(pw.PATCH)(req('/api/users/me/password', 'PATCH', { newPassword: 'abcdefgh' })),
      strict(av.GET)(req('/api/users/me/avatar', 'GET')), strict(av.PUT)(req('/api/users/me/avatar', 'PUT', undefined, {}, new Uint8Array([0xff, 0xd8, 0xff]))), strict(av.DELETE)(req('/api/users/me/avatar', 'DELETE')),
    ])
    expect(answers.map((r) => r.status)).toEqual([401, 401, 401, 401, 401, 401])
    expect(calls.deleted).toEqual([])
  })
})

describe('profile', () => {
  it('saves a name and a phone number', async () => {
    const PATCH = strict((await import('@/app/api/users/me/route')).PATCH)
    const res = await PATCH(req('/api/users/me', 'PATCH', { fullName: ' Ada L ', phone: '+234 801 234 5678' }))
    expect(res.status).toBe(200)
    expect(calls.profile[0]).toEqual({ fullName: 'Ada L', phone: '+234 801 234 5678' })
  })
  it('turns an empty phone into none, and refuses nonsense', async () => {
    const PATCH = strict((await import('@/app/api/users/me/route')).PATCH)
    await PATCH(req('/api/users/me', 'PATCH', { phone: '' }))
    expect(calls.profile[0]).toEqual({ phone: null })
    expect((await PATCH(req('/api/users/me', 'PATCH', { phone: 'call me maybe' }))).status).toBe(400)
  })
  it('cannot set the email, admin flag or id through the profile', async () => {
    const PATCH = strict((await import('@/app/api/users/me/route')).PATCH)
    for (const bad of [{ email: 'x@y.co' }, { isAdmin: true }, { id: 'u2' }, { passwordHash: 'x' }]) {
      expect((await PATCH(req('/api/users/me', 'PATCH', bad))).status).toBe(400)
    }
    expect(calls.profile).toHaveLength(0)
  })
})

describe('password', () => {
  it('needs the current password when there is one', async () => {
    const PATCH = strict((await import('@/app/api/users/me/password/route')).PATCH)
    expect((await PATCH(req('/api/users/me/password', 'PATCH', { newPassword: 'brand-new-pw-1' }))).status).toBe(400)
    expect((await PATCH(req('/api/users/me/password', 'PATCH', { currentPassword: 'wrong', newPassword: 'brand-new-pw-1' }))).status).toBe(400)
    expect(calls.passwords).toHaveLength(0)
  })
  it('changes it, keeps this device signed in, and gives the app a fresh token', async () => {
    const PATCH = strict((await import('@/app/api/users/me/password/route')).PATCH)
    const web = await PATCH(req('/api/users/me/password', 'PATCH', { currentPassword: 'old-password-1', newPassword: 'brand-new-pw-1' }))
    expect(web.status).toBe(200)
    expect(web.cookies.get('shopora_session')?.value).toBeTruthy()
    expect((await web.json()).body?.token).toBeUndefined()
    expect(calls.passwords[0]).toMatch(/^\$2[aby]\$/)
    const app = await PATCH(req('/api/users/me/password', 'PATCH', { currentPassword: 'old-password-1', newPassword: 'brand-new-pw-2' }, { 'x-shopora-client': 'mobile' }))
    expect(typeof (await app.json()).body.token).toBe('string')
  })
  it('a Google-only account can set one without a current password', async () => {
    const PATCH = strict((await import('@/app/api/users/me/password/route')).PATCH)
    const keep = db
    db = { ...db, passwordHash: null }
    const res = await PATCH(req('/api/users/me/password', 'PATCH', { newPassword: 'brand-new-pw-1' }))
    expect(res.status).toBe(200)
    expect((await res.json()).message).toBe('Password set')
    db = keep
  })
  it('refuses a weak new password', async () => {
    const PATCH = strict((await import('@/app/api/users/me/password/route')).PATCH)
    expect((await PATCH(req('/api/users/me/password', 'PATCH', { currentPassword: 'old-password-1', newPassword: 'short' }))).status).toBe(400)
  })
})

describe('photo', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
  it('accepts a real image and serves it back, then removes it', async () => {
    const av = await import('@/app/api/users/me/avatar/route')
    expect((await strict(av.PUT)(req('/api/users/me/avatar', 'PUT', undefined, {}, jpeg))).status).toBe(200)
    const got = await strict(av.GET)(req('/api/users/me/avatar', 'GET'))
    expect(got.status).toBe(200)
    expect(got.headers.get('content-type')).toBe('image/jpeg')
    expect((await strict(av.DELETE)(req('/api/users/me/avatar', 'DELETE'))).status).toBe(200)
    expect((await strict(av.GET)(req('/api/users/me/avatar', 'GET'))).status).toBe(404)
  })
  it('decides the type from the bytes, not the header', async () => {
    const av = await import('@/app/api/users/me/avatar/route')
    const text = new TextEncoder().encode('<script>alert(1)</script>')
    expect((await strict(av.PUT)(req('/api/users/me/avatar', 'PUT', undefined, { 'content-type': 'image/png' }, text))).status).toBe(415)
  })
  it('refuses an empty or oversized upload', async () => {
    const av = await import('@/app/api/users/me/avatar/route')
    expect((await strict(av.PUT)(req('/api/users/me/avatar', 'PUT', undefined, {}, new Uint8Array()))).status).toBe(400)
    const big = new Uint8Array(1_600_000)
    big.set([0xff, 0xd8, 0xff])
    expect((await strict(av.PUT)(req('/api/users/me/avatar', 'PUT', undefined, {}, big))).status).toBe(413)
  })
})

describe('delete account', () => {
  it('needs the right password', async () => {
    const DELETE = strict((await import('@/app/api/users/me/route')).DELETE)
    expect((await DELETE(req('/api/users/me', 'DELETE', {}))).status).toBe(400)
    expect((await DELETE(req('/api/users/me', 'DELETE', { password: 'nope' }))).status).toBe(400)
    expect(calls.deleted).toEqual([])
  })
  it('deletes and signs out with the right password', async () => {
    const DELETE = strict((await import('@/app/api/users/me/route')).DELETE)
    const res = await DELETE(req('/api/users/me', 'DELETE', { password: 'old-password-1' }))
    expect(res.status).toBe(200)
    expect(calls.deleted).toEqual(['u1'])
    expect(res.cookies.get('shopora_session')?.value).toBe('')
  })
  it('a Google-only account confirms by typing its email', async () => {
    const DELETE = strict((await import('@/app/api/users/me/route')).DELETE)
    const keep = db
    db = { ...db, passwordHash: null }
    expect((await DELETE(req('/api/users/me', 'DELETE', { confirmEmail: 'someone@else.com' }))).status).toBe(400)
    expect((await DELETE(req('/api/users/me', 'DELETE', { confirmEmail: 'A@example.com' }))).status).toBe(200)
    db = keep
  })
})
