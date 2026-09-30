import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

const API = 'https://api.paystack.co'

export class PaystackError extends Error {}

export const paystackConfigured = () => !!process.env.PAYSTACK_SECRET_KEY
/** Test keys start with sk_test_. The UI says "Test mode" while this is true. */
export const paystackTestMode = () => (process.env.PAYSTACK_SECRET_KEY ?? '').startsWith('sk_test_')

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new PaystackError('PAYSTACK_SECRET_KEY is not set')
  return key
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null
  if (!res.ok || !json?.status || json.data === undefined) {
    // The message comes from Paystack; the key is never included.
    throw new PaystackError(json?.message ?? `Paystack responded ${res.status}`)
  }
  return json.data
}

export type PaystackInit = { authorization_url: string; access_code: string; reference: string }

export function initializeTransaction(args: {
  email: string
  amount: number
  currency: string
  reference: string
  callbackUrl: string
}) {
  return call<PaystackInit>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: args.email,
      amount: args.amount,
      currency: args.currency,
      reference: args.reference,
      callback_url: args.callbackUrl,
    }),
  })
}

export type PaystackVerification = { status: string; amount: number; currency: string; reference: string }

export function verifyTransaction(reference: string) {
  return call<PaystackVerification>(`/transaction/verify/${encodeURIComponent(reference)}`)
}

/** Paystack signs the raw webhook body with HMAC-SHA512 using the secret key (hex, `x-paystack-signature`). */
export function validWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !paystackConfigured()) return false
  const expected = createHmac('sha512', secret()).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
