import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

// Nobody is signed in. The database is replaced so any query would throw: an admin route must refuse before reaching it.
vi.mock('./current-user', () => ({ getRequestUser: async () => null, getSessionUser: async () => null }))
vi.mock('./db/client', () => ({ sql: () => { throw new Error('the database must not be touched') } }))

const call = (path: string, method = 'GET', body?: unknown) =>
  new NextRequest(`http://localhost${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })

describe('admin endpoints answer 404 to everyone who is not an admin', () => {
  it('lists', async () => {
    const orders = await import('@/app/api/admin/orders/route')
    const products = await import('@/app/api/admin/products/route')
    const discounts = await import('@/app/api/admin/discounts/route')
    const answers = await Promise.all([orders.GET(call('/api/admin/orders')), products.GET(call('/api/admin/products')), discounts.GET(call('/api/admin/discounts'))])
    expect(answers.map((r) => r?.status)).toEqual([404, 404, 404])
  })
  it('writes', async () => {
    const products = await import('@/app/api/admin/products/route')
    expect((await products.POST(call('/api/admin/products', 'POST', { name: 'X', priceNaira: 5, stock: 1, category: 'bags' })))?.status).toBe(404)
  })
})
