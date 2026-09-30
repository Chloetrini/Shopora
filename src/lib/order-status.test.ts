import { describe, expect, it } from 'vitest'
import { canTransition, isPaidStatus, progressPercent, stepIndex } from './order-status'

describe('order status rules', () => {
  it('knows which statuses are paid', () => {
    for (const s of ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']) expect(isPaidStatus(s)).toBe(true)
    for (const s of ['pending', 'cancelled', 'nonsense']) expect(isPaidStatus(s)).toBe(false)
  })
  it('moves forward only, and skipping a step is allowed', () => {
    expect(canTransition('confirmed', 'processing')).toBe(true)
    expect(canTransition('confirmed', 'shipped')).toBe(true)
    expect(canTransition('shipped', 'processing')).toBe(false)
    expect(canTransition('shipped', 'shipped')).toBe(false)
    expect(canTransition('delivered', 'shipped')).toBe(false)
  })
  it('cancels anything not yet delivered, never a cancelled or delivered order', () => {
    expect(canTransition('confirmed', 'cancelled')).toBe(true)
    expect(canTransition('out_for_delivery', 'cancelled')).toBe(true)
    expect(canTransition('delivered', 'cancelled')).toBe(false)
    expect(canTransition('cancelled', 'processing')).toBe(false)
  })
  it('an unpaid order cannot be moved by hand', () => {
    expect(canTransition('pending', 'shipped')).toBe(false)
    expect(canTransition('pending', 'cancelled')).toBe(false)
  })
  it('reports progress for the timeline', () => {
    expect(stepIndex('pending')).toBe(-1)
    expect(stepIndex('shipped')).toBe(2)
    expect(stepIndex('cancelled')).toBeNull()
    expect(progressPercent('pending')).toBe(0)
    expect(progressPercent('confirmed')).toBe(20)
    expect(progressPercent('delivered')).toBe(100)
    expect(progressPercent('cancelled')).toBe(0)
  })
})
