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

import { addressSchema, discountCreateSchema, notifySchema, reviewSchema } from './validation'
import { authorLabel, averageRating } from './review'

describe('review, address, notify and discount schemas', () => {
  it('reviews need a 1 to 5 whole rating and a short body', () => {
    expect(reviewSchema.safeParse({ rating: 5, body: ' Great ' }).success).toBe(true)
    for (const bad of [{ rating: 0 }, { rating: 6 }, { rating: 4.5 }, { rating: 3, body: 'x'.repeat(1001) }, { rating: 3, userId: 'x' }]) {
      expect(reviewSchema.safeParse(bad).success).toBe(false)
    }
  })
  it('addresses are strict and need the core fields', () => {
    const ok = { fullName: 'Ada', addressLine1: '1 Main', city: 'Lagos', postalCode: '1', country: 'NG' }
    expect(addressSchema.safeParse(ok).success).toBe(true)
    expect(addressSchema.safeParse({ ...ok, userId: 'x' }).success).toBe(false)
    expect(addressSchema.safeParse({ ...ok, city: '' }).success).toBe(false)
  })
  it('notify lower-cases and validates the email', () => {
    expect(notifySchema.parse({ email: ' A@B.CO ' }).email).toBe('a@b.co')
    expect(notifySchema.safeParse({ email: 'nope' }).success).toBe(false)
  })
  it('a discount is a percentage OR an amount, never both or neither', () => {
    expect(discountCreateSchema.safeParse({ code: 'save10', percentOff: 10 }).success).toBe(true)
    expect(discountCreateSchema.parse({ code: 'save10', percentOff: 10 }).code).toBe('SAVE10')
    expect(discountCreateSchema.safeParse({ code: 'SAVE10', percentOff: 10, amountOffNaira: 500 }).success).toBe(false)
    expect(discountCreateSchema.safeParse({ code: 'SAVE10' }).success).toBe(false)
    expect(discountCreateSchema.safeParse({ code: 'SAVE10', percentOff: 95 }).success).toBe(false)
    expect(discountCreateSchema.safeParse({ code: 'ab', percentOff: 10 }).success).toBe(false)
  })
  it('order schema uppercases a discount code', () => {
    const base = { items: [{ productId: '4f0ecb8e-7b0c-4c39-9d0f-1f5a5b0f9d11', quantity: 1 }], email: 'a@b.co', fullName: 'A', addressLine1: '1', city: 'L', postalCode: '1', country: 'NG' }
    expect(orderSchema.parse({ ...base, discountCode: ' save10 ' }).discountCode).toBe('SAVE10')
    expect(orderSchema.parse({ ...base, discountCode: '' }).discountCode).toBeUndefined()
  })
})

describe('review helpers', () => {
  it('shortens names and averages ratings', () => {
    expect(authorLabel('Ada Lovelace')).toBe('Ada L.')
    expect(authorLabel('  ada  ')).toBe('ada')
    expect(authorLabel('')).toBe('Customer')
    expect(averageRating([5, 4, 4])).toBe(4.3)
    expect(averageRating([])).toBe(0)
  })
})
