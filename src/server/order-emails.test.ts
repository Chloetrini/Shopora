import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  claimConfirmation: vi.fn(),
  releaseConfirmation: vi.fn(),
  getOrder: vi.fn(),
}))
const mail = vi.hoisted(() => ({ sendEmail: vi.fn() }))
vi.mock('./db/orders', () => db)
vi.mock('./email.service', () => mail)

import { sendConfirmationOnce } from './order-emails'

const order = {
  id: '4f0ecb8e-7b0c-4c39-9d0f-1f5a5b0f9d11', email: 'ada@example.com', fullName: 'Ada', status: 'confirmed',
  totalCents: 100, currency: 'NGN', createdAt: '2026-09-30T00:00:00.000Z', address: 'x', items: [{ name: 'Mug', unitPriceCents: 100, quantity: 1 }],
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
