import { describe, expect, it } from 'vitest'
import { decidePayment, orderIdFromReference } from './payment-rules'

const order = { status: 'pending', totalCents: 460000, currency: 'NGN' }
const paid = { status: 'success', amount: 460000, currency: 'NGN' }

describe('decidePayment', () => {
  it('confirms a matching successful payment', () => expect(decidePayment(order, paid)).toBe('confirm'))
  it('rejects a different amount or currency', () => {
    expect(decidePayment(order, { ...paid, amount: 100 })).toBe('mismatch')
    expect(decidePayment(order, { ...paid, currency: 'USD' })).toBe('mismatch')
  })
  it('does not confirm abandoned or failed payments', () => {
    expect(decidePayment(order, { ...paid, status: 'abandoned' })).toBe('not_paid')
    expect(decidePayment(order, { ...paid, status: 'failed' })).toBe('not_paid')
  })
  it('is a no-op when already confirmed, and never revives a cancelled order', () => {
    expect(decidePayment({ ...order, status: 'confirmed' }, paid)).toBe('already_done')
    expect(decidePayment({ ...order, status: 'shipped' }, paid)).toBe('already_done')
    expect(decidePayment({ ...order, status: 'cancelled' }, paid)).toBe('not_paid')
  })
})

describe('orderIdFromReference', () => {
  const id = '4f0ecb8e-7b0c-4c39-9d0f-1f5a5b0f9d11'
  it('extracts the order id', () => expect(orderIdFromReference(`${id}-a1b2c3d4e5f6`)).toBe(id))
  it('rejects anything else', () => {
    expect(orderIdFromReference('abc')).toBeNull()
    expect(orderIdFromReference(`${id}`)).toBeNull()
    expect(orderIdFromReference(`x${id}-ab`)).toBeNull()
  })
})
