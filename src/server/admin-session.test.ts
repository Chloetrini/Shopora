import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'
import { sealSession } from './session'

process.env.SESSION_SECRET = 'q'.repeat(40)
process.env.ADMIN_EMAILS = 'boss@example.com'

type Rec = { id: string; email: string; fullName: string; passwordHash: string | null; googleId: string | null; emailVerified: boolean; sessionVersion: number; phone: string | null; avatarV: number | null }
const boss: Rec = { id: 'b1', email: 'Boss@Example.com', fullName: 'Boss', passwordHash: null, googleId: 'g', emailVerified: true, sessionVersion: 0, phone: null, avatarV: null }
const other: Rec = { id: 'o1', email: 'other@example.com', fullName: 'Other', passwordHash: 'x', googleId: null, emailVerified: true, sessionVersion: 0, phone: null, avatarV: 5 }
const byId: Record<string, Rec> = { b1: boss, o1: other }

// The real session pipeline runs (cookie or token -> user -> admin check); only the database is replaced.
vi.mock('./db/users', async (orig) => ({ ...(await orig<typeof import('./db/users')>()), findUserById: async (id: string) => byId[id] ?? null }))
vi.mock('./db/orders', async (orig) => ({ ...(await orig<typeof import('./db/orders')>()), listOrdersForAdmin: async () => [], countUnsentConfirmations: async () => 0 }))
vi.mock('./db/features', async (orig) => ({ ...(await orig<typeof import('./db/features')>()), listAllProducts: async () => [], listDiscounts: async () => [] }))

const as = async (u: Rec, how: 'cookie' | 'token', path: string) => {
  const sealed = await sealSession({ uid: u.id, v: u.sessionVersion })
  return new NextRequest(`http://localhost${path}`, how === 'cookie' ? { headers: { cookie: `shopora_session=${sealed}` } } : { headers: { authorization: `Bearer ${sealed}` } })
}

describe('the admin check end to end', () => {
  it('an admin (matching ADMIN_EMAILS, any capitals) gets the admin lists, by cookie and by app token', async () => {
    const orders = await import('@/app/api/admin/orders/route')
    const products = await import('@/app/api/admin/products/route')
    const discounts = await import('@/app/api/admin/discounts/route')
    for (const how of ['cookie', 'token'] as const) {
      expect((await orders.GET(await as(boss, how, '/api/admin/orders')))?.status).toBe(200)
      expect((await products.GET(await as(boss, how, '/api/admin/products')))?.status).toBe(200)
      expect((await discounts.GET(await as(boss, how, '/api/admin/discounts')))?.status).toBe(200)
    }
  })
  it('a signed-in person who is not listed gets 404', async () => {
    const orders = await import('@/app/api/admin/orders/route')
    expect((await orders.GET(await as(other, 'cookie', '/api/admin/orders')))?.status).toBe(404)
    expect((await orders.GET(await as(other, 'token', '/api/admin/orders')))?.status).toBe(404)
  })
  it('an admin whose email is not verified is not an admin', async () => {
    const orders = await import('@/app/api/admin/orders/route')
    byId.b1 = { ...boss, emailVerified: false }
    expect((await orders.GET(await as(byId.b1, 'cookie', '/api/admin/orders')))?.status).toBe(404)
    byId.b1 = boss
  })
})
