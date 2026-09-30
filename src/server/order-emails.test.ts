import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  markConfirmationSent: vi.fn(),
  claimConfirmation: vi.fn(),
  releaseConfirmation: vi.fn(),
  getOrder: vi.fn(),
}))
const mail = vi.hoisted(() => ({ sendEmail: vi.fn() }))
vi.mock('./db/orders', () => db)
vi.mock('./email.service', () => mail)

import { resendConfirmation, sendConfirmationOnce } from './order-emails'

const order = {
  id: '4f0ecb8e-7b0c-4c39-9d0f-1f5a5b0f9d11', email: 'ada@example.com', fullName: 'Ada', status: 'confirmed',
  totalCents: 100, subtotalCents: 100, discountCode: null, discountCents: 0, deliveryCents: 0, deliveryZone: null, currency: 'NGN', createdAt: '2026-09-30T00:00:00.000Z', address: 'x', items: [{ name: 'Mug', unitPriceCents: 100, quantity: 1 }],
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  db.getOrder.mockResolvedValue(order)
})

describe('sendConfirmationOnce', () => {
  it('sends once to the buyer when it wins the claim', async () => {
    db.claimConfirmation.mockResolvedValue(true)
    mail.sendEmail.mockResolvedValue('sent')
    await sendConfirmationOnce(order.id)
    expect(mail.sendEmail).toHaveBeenCalledTimes(1)
    expect(mail.sendEmail.mock.calls[0][0].to).toBe('ada@example.com')
    expect(db.releaseConfirmation).not.toHaveBeenCalled()
  })
  it('does nothing when someone else already claimed it', async () => {
    db.claimConfirmation.mockResolvedValue(false)
    await sendConfirmationOnce(order.id)
    expect(mail.sendEmail).not.toHaveBeenCalled()
  })
  it('releases the claim when Mailgun fails, and does not throw', async () => {
    db.claimConfirmation.mockResolvedValue(true)
    mail.sendEmail.mockRejectedValue(new Error('Mailgun responded 500'))
    await expect(sendConfirmationOnce(order.id)).resolves.toBeUndefined()
    expect(db.releaseConfirmation).toHaveBeenCalledWith(order.id)
  })
  it('releases the claim when nothing was actually sent (no keys in production)', async () => {
    db.claimConfirmation.mockResolvedValue(true)
    mail.sendEmail.mockResolvedValue('skipped')
    await sendConfirmationOnce(order.id)
    expect(db.releaseConfirmation).toHaveBeenCalledWith(order.id)
  })
  it('never emails an order that is not confirmed', async () => {
    db.claimConfirmation.mockResolvedValue(true)
    db.getOrder.mockResolvedValue({ ...order, status: 'pending' })
    await sendConfirmationOnce(order.id)
    expect(mail.sendEmail).not.toHaveBeenCalled()
    expect(db.releaseConfirmation).toHaveBeenCalled()
  })
})

describe('resendConfirmation (admin tool)', () => {
  it('reports success and marks the order as emailed', async () => {
    mail.sendEmail.mockResolvedValue('sent')
    expect(await resendConfirmation(order.id)).toEqual({ ok: true, result: 'sent' })
    expect(db.markConfirmationSent).toHaveBeenCalledWith(order.id)
  })
  it('returns the provider’s reason instead of hiding it', async () => {
    mail.sendEmail.mockRejectedValue(new Error('Mailgun responded 403: Sandbox subdomains are for test purposes only'))
    const r = await resendConfirmation(order.id)
    expect(r).toEqual({ ok: false, error: 'Mailgun responded 403: Sandbox subdomains are for test purposes only' })
    expect(db.markConfirmationSent).not.toHaveBeenCalled()
  })
  it('does not mark anything as sent when nothing was sent, and refuses unpaid orders', async () => {
    mail.sendEmail.mockResolvedValue('skipped')
    expect(await resendConfirmation(order.id)).toEqual({ ok: true, result: 'skipped' })
    expect(db.markConfirmationSent).not.toHaveBeenCalled()
    db.getOrder.mockResolvedValue({ ...order, status: 'pending' })
    expect((await resendConfirmation(order.id)).ok).toBe(false)
  })
})
