import { NextResponse, type NextRequest } from 'next/server'
import { siteUrl } from '@/lib/site-url'
import { validAppRedirect } from '@/server/app-auth'
import { finalizePayment } from '@/server/payments'

/** Where Paystack sends the buyer back. Verifies with Paystack, never trusts the query string. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const reference = q.get('reference') ?? q.get('trxref')
  const go = (path: string) => NextResponse.redirect(new URL(path, siteUrl()))
  // Paid from the phone app: send the buyer back into the app, which shows its own order screen.
  const appReturn = validAppRedirect(q.get('app_return'))
  const back = (orderId: string | null, status: 'paid' | 'failed' | 'checking') => {
    const u = new URL(appReturn as string)
    if (orderId) u.searchParams.set('order', orderId)
    u.searchParams.set('status', status)
    return NextResponse.redirect(u.toString())
  }
  if (!reference) return appReturn ? back(null, 'failed') : go('/')
  try {
    const { orderId, verdict } = await finalizePayment(reference)
    if (!orderId) return appReturn ? back(null, 'failed') : go('/')
    const ok = verdict === 'confirm' || verdict === 'already_done'
    if (appReturn) return back(orderId, ok ? 'paid' : 'failed')
    return go(`/orders/${orderId}${ok ? '' : '?payment=failed'}`)
  } catch (e) {
    console.error('Paystack callback failed', e)
    const id = /^[0-9a-f-]{36}/i.exec(reference)?.[0]
    // Paystack unreachable: the webhook may still confirm it, so don't say it failed.
    if (appReturn) return back(id ?? null, 'checking')
    return go(id ? `/orders/${id}?payment=checking` : '/')
  }
}
