import { describe, expect, it } from 'vitest'
import { orderSchema } from './validation'

const valid = {
  items: [{ productId: '4f0ecb8e-7b0c-4c39-9d0f-1f5a5b0f9d11', quantity: 2 }],
  email: ' Ada@Example.com ',
  fullName: 'Ada Lovelace',
  addressLine1: '1 Main St',
  city: 'Lagos',
  postalCode: '100001',
  country: 'Nigeria',
}

describe('orderSchema', () => {
  it('accepts a valid order and normalises the email', () => {
    const r = orderSchema.parse(valid)
    expect(r.email).toBe('ada@example.com')
    expect(r.addressLine2).toBe('')
  })
  it('rejects an empty cart, bad quantities and non-uuid ids', () => {
    expect(orderSchema.safeParse({ ...valid, items: [] }).success).toBe(false)
    expect(orderSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity: 0 }] }).success).toBe(false)
    expect(orderSchema.safeParse({ ...valid, items: [{ productId: 'x', quantity: 1 }] }).success).toBe(false)
  })
  it('rejects smuggled fields such as a price or total', () => {
    expect(orderSchema.safeParse({ ...valid, totalCents: 1 }).success).toBe(false)
  })
})
