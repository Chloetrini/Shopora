import { describe, expect, it } from 'vitest'
import { configStatus } from './config-status'

describe('configStatus', () => {
  it('reports nothing configured on an empty env', () => {
    const s = configStatus({})
    expect(s.email).toBe('not configured')
    expect(s.payments).toBe('not configured')
    expect(s.google).toBe('not configured')
    expect(s.sessionSecret).toMatch(/missing/)
  })
  it('distinguishes test and live Paystack keys', () => {
    expect(configStatus({ PAYSTACK_SECRET_KEY: 'sk_test_x' }).payments).toBe('configured (test mode)')
    expect(configStatus({ PAYSTACK_SECRET_KEY: 'sk_live_x' }).payments).toBe('configured (LIVE mode)')
  })
  it('needs all Mailgun values and both Google values', () => {
    expect(configStatus({ MAILGUN_API_KEY: 'k', MAILGUN_DOMAIN: 'd' }).email).toBe('not configured')
    expect(configStatus({ MAILGUN_API_KEY: 'k', MAILGUN_DOMAIN: 'd', MAILGUN_FROM: 'f' }).email).toBe('configured')
    expect(configStatus({ GOOGLE_CLIENT_ID: 'a' }).google).toBe('not configured')
  })
  it('never echoes a secret', () => {
    const out = JSON.stringify(configStatus({ SESSION_SECRET: 'x'.repeat(40), PAYSTACK_SECRET_KEY: 'sk_test_SECRETVALUE', MAILGUN_API_KEY: 'key-abc', MAILGUN_DOMAIN: 'd', MAILGUN_FROM: 'f' }))
    expect(out).not.toMatch(/SECRETVALUE|key-abc|xxxx/)
  })
})
