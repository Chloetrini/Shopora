import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.SESSION_SECRET = 'y'.repeat(40)
process.env.APP_URL = 'https://shop.test'

const finalizePayment = vi.fn()
vi.mock('@/server/payments', () => ({ finalizePayment: (...a: unknown[]) => finalizePayment(...a) }))

import { GET } from './route'

const ORDER = '11111111-2222-3333-4444-555555555555'
const call = (q: string) => GET(new NextRequest(`https://shop.test/api/paystack/callback?${q}`))

describe('Paystack callback', () => {
  beforeEach(() => finalizePayment.mockReset())

  it('sends the website buyer to the website order page', async () => {
    finalizePayment.mockResolvedValue({ orderId: ORDER, verdict: 'confirm' })
    const res = await call(`reference=${ORDER}-ab`)
    expect(res.headers.get('location')).toBe(`https://shop.test/orders/${ORDER}`)
  })

  it('sends the app buyer back into the app, with the result', async () => {
    finalizePayment.mockResolvedValue({ orderId: ORDER, verdict: 'confirm' })
    const res = await call(`app_return=${encodeURIComponent('shopora://paid')}&reference=${ORDER}-ab`)
    const to = new URL(res.headers.get('location') as string)
    expect(to.protocol).toBe('shopora:')
    expect(to.searchParams.get('order')).toBe(ORDER)
    expect(to.searchParams.get('status')).toBe('paid')
  })

  it('reports a failed payment and an unreachable Paystack to the app', async () => {
    finalizePayment.mockResolvedValueOnce({ orderId: ORDER, verdict: 'mismatch' })
    const failed = await call(`app_return=${encodeURIComponent('exp://192.168.1.5:8081/--/paid')}&reference=${ORDER}-ab`)
    expect(new URL(failed.headers.get('location') as string).searchParams.get('status')).toBe('failed')

    finalizePayment.mockRejectedValueOnce(new Error('down'))
    const checking = await call(`app_return=${encodeURIComponent('shopora://paid')}&reference=${ORDER}-ab`)
    expect(new URL(checking.headers.get('location') as string).searchParams.get('status')).toBe('checking')
  })

  it('never redirects to a website passed as app_return', async () => {
    finalizePayment.mockResolvedValue({ orderId: ORDER, verdict: 'confirm' })
    const res = await call(`app_return=${encodeURIComponent('https://evil.example')}&reference=${ORDER}-ab`)
    expect(res.headers.get('location')).toBe(`https://shop.test/orders/${ORDER}`)
  })
})
