import { describe, expect, it } from 'vitest'
import { escapeHtml, orderConfirmationEmail } from './email-templates'
import type { OrderView } from './db/orders'

const order: OrderView = {
  id: '4f0ecb8e-7b0c-4c39-9d0f-1f5a5b0f9d11',
  email: 'ada@example.com',
  fullName: '<script>alert(1)</script> Ada',
  status: 'confirmed',
  totalCents: 3200000,
  currency: 'NGN',
  createdAt: '2026-09-30T12:00:00.000Z',
  address: '1 Main St, Lagos "NG"',
  items: [
    { name: 'Mug <b>', unitPriceCents: 1400000, quantity: 2 },
    { name: 'Tote', unitPriceCents: 400000, quantity: 1 },
  ],
  events: [],
}

describe('orderConfirmationEmail', () => {
  it('includes the essentials in both parts', () => {
    const e = orderConfirmationEmail(order)
    expect(e.subject).toContain('4f0ecb8e')
    for (const part of [e.text, e.html]) {
      expect(part).toContain('₦32,000.00')
      expect(part).toContain('/orders/4f0ecb8e-7b0c-4c39-9d0f-1f5a5b0f9d11')
    }
  })
  it('escapes everything a buyer typed in the HTML part', () => {
    const { html } = orderConfirmationEmail(order)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('Mug <b>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;NG&quot;')
  })
  it('escapeHtml handles the five special characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})

import { orderStatusEmail } from './email-templates'

describe('orderStatusEmail', () => {
  it('says what happened and links to the tracking page', () => {
    const e = orderStatusEmail({ ...order, status: 'shipped' }, 'shipped', 'Courier: DHL 12345')
    expect(e.subject).toContain('on its way')
    expect(e.text).toContain('Courier: DHL 12345')
    expect(e.text).toContain('/orders/4f0ecb8e-7b0c-4c39-9d0f-1f5a5b0f9d11')
  })
  it('escapes the note and the buyer name in the HTML', () => {
    const e = orderStatusEmail(order, 'delivered', '<img src=x onerror=alert(1)>')
    expect(e.html).not.toContain('<img')
    expect(e.html).not.toContain('<script>')
  })
  it('has a message for every status that sends mail', () => {
    for (const s of ['shipped', 'out_for_delivery', 'delivered', 'cancelled'] as const) {
      expect(orderStatusEmail(order, s, null).subject.length).toBeGreaterThan(5)
    }
  })
})
