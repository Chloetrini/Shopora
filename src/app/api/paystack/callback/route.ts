import { NextResponse, type NextRequest } from 'next/server'
import { siteUrl } from '@/lib/site-url'
import { finalizePayment } from '@/server/payments'

/** Where Paystack sends the buyer back. Verifies with Paystack, never trusts the query string. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const reference = q.get('reference') ?? q.get('trxref')
  const go = (path: string) => NextResponse.redirect(new URL(path, siteUrl()))
  if (!reference) return go('/')
  try {
    const { orderId, verdict } = await finalizePayment(reference)
    if (!orderId) return go('/')
    const ok = verdict === 'confirm' || verdict === 'already_done'
    return go(`/orders/${orderId}${ok ? '' : '?payment=failed'}`)
  } catch (e) {
    console.error('Paystack callback failed', e)
    const id = /^[0-9a-f-]{36}/i.exec(reference)?.[0]
    // Paystack unreachable: the webhook may still confirm it, so don't say it failed.
    return go(id ? `/orders/${id}?payment=checking` : '/')
  }
}
