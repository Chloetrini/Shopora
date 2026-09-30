import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initializeTransaction, paystackTestMode, validWebhookSignature, verifyTransaction } from './paystack'

beforeEach(() => vi.stubEnv('PAYSTACK_SECRET_KEY', 'sk_test_abc123'))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const reply = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe('paystack client', () => {
  it('initialises with the bearer key and amount in kobo', async () => {
    const fetchMock = reply({ status: true, data: { authorization_url: 'https://checkout.paystack.com/x', access_code: 'x', reference: 'r' } })
    vi.stubGlobal('fetch', fetchMock)
    const r = await initializeTransaction({ email: 'a@b.co', amount: 460000, currency: 'NGN', reference: 'r', callbackUrl: 'https://shop.test/cb' })
    expect(r.authorization_url).toBe('https://checkout.paystack.com/x')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.paystack.co/transaction/initialize')
    expect(init.headers.Authorization).toBe('Bearer sk_test_abc123')
    expect(JSON.parse(init.body)).toMatchObject({ email: 'a@b.co', amount: 460000, currency: 'NGN', reference: 'r', callback_url: 'https://shop.test/cb' })
  })
  it('verifies by reference', async () => {
    const fetchMock = reply({ status: true, data: { status: 'success', amount: 100, currency: 'NGN', reference: 'r/1' } })
    vi.stubGlobal('fetch', fetchMock)
    expect((await verifyTransaction('r/1')).status).toBe('success')
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.paystack.co/transaction/verify/r%2F1')
  })
  it('throws Paystack’s message and never the key', async () => {
    vi.stubGlobal('fetch', reply({ status: false, message: 'Invalid key' }, 401))
    await expect(verifyTransaction('r')).rejects.toThrow('Invalid key')
    await expect(verifyTransaction('r')).rejects.not.toThrow(/sk_test/)
  })
  it('reports test mode from the key prefix', () => {
    expect(paystackTestMode()).toBe(true)
    vi.stubEnv('PAYSTACK_SECRET_KEY', 'sk_live_abc')
    expect(paystackTestMode()).toBe(false)
  })
})

describe('webhook signature', () => {
  const body = '{"event":"charge.success"}'
  const sig = (b: string, key = 'sk_test_abc123') => createHmac('sha512', key).update(b).digest('hex')
  it('accepts the right signature', () => expect(validWebhookSignature(body, sig(body))).toBe(true))
  it('rejects a wrong key, altered body, missing header, or no configured key', () => {
    expect(validWebhookSignature(body, sig(body, 'other'))).toBe(false)
    expect(validWebhookSignature(body + ' ', sig(body))).toBe(false)
    expect(validWebhookSignature(body, null)).toBe(false)
    vi.stubEnv('PAYSTACK_SECRET_KEY', '')
    expect(validWebhookSignature(body, sig(body))).toBe(false)
  })
})
