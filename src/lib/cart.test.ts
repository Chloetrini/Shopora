import { describe, expect, it } from 'vitest'
import { addItem, cartCount, cartTotalCents, parseCart, removeItem, setQuantity } from './cart'

const mug = { productId: 'a', name: 'Mug', priceCents: 1400, currency: 'USD' }
const tote = { productId: 'b', name: 'Tote', priceCents: 1800, currency: 'USD' }

describe('cart', () => {
  it('adds, merges and totals', () => {
    let c = addItem([], mug)
    c = addItem(c, mug)
    c = addItem(c, tote, 2)
    expect(cartCount(c)).toBe(4)
    expect(cartTotalCents(c)).toBe(1400 * 2 + 1800 * 2)
  })
  it('caps a line at the maximum quantity', () => {
    expect(setQuantity(addItem([], mug), 'a', 99)[0].quantity).toBe(10)
  })
  it('quantity 0 or remove drops the line', () => {
    const c = addItem(addItem([], mug), tote)
    expect(setQuantity(c, 'a', 0)).toHaveLength(1)
    expect(removeItem(c, 'b')).toHaveLength(1)
  })
  it('ignores garbage in storage', () => {
    expect(parseCart('not json')).toEqual([])
    expect(parseCart('{"a":1}')).toEqual([])
    expect(parseCart(JSON.stringify([{ productId: 1 }, { ...mug, quantity: 2 }]))).toHaveLength(1)
    expect(parseCart(null)).toEqual([])
  })
})
