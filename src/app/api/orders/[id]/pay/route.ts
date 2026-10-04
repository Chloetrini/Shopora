import { NextResponse, type NextRequest } from 'next/server'
import { siteUrl } from '@/lib/site-url'
import { validAppRedirect } from '@/server/app-auth'
import { startPayment } from '@/server/payments'
import { paystackConfigured, PaystackError } from '@/server/paystack'
import { allow, clientIp } from '@/server/rate-limit'

/** Start (or restart) payment for a pending order. The order id in the URL is the guest's access key. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!allow(`pay:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
    return NextResponse.json({ success: false, message: 'Too many attempts. Try again in a few minutes.' }, { status: 429 })
  }
  if (!paystackConfigured()) {
    return NextResponse.json({ success: false, message: 'Payments are not set up yet.' }, { status: 503 })
  }
  try {
    // Optional body from the phone app: where to send the buyer back to afterwards (its own link only).
    const body = (await req.json().catch(() => null)) as { appReturn?: unknown } | null
    const appReturn = validAppRedirect(typeof body?.appReturn === 'string' ? body.appReturn : null)
    const url = await startPayment((await params).id, appReturn)
    if (!url) return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 })
    return NextResponse.json({ success: true, message: 'Payment started', body: { paymentUrl: url } })
  } catch (e) {
    console.error('startPayment failed', e instanceof PaystackError ? e.message : e)
    return NextResponse.json({ success: false, message: 'Could not start the payment. Try again.' }, { status: 502 })
  }
}

/**
 * The same, as a link: starts the payment and sends the browser on to Paystack. The phone app opens this right after
 * signing the browser in, so the person lands back on the order page already logged in.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const res = await POST(req, ctx)
  if (res.status !== 200) return NextResponse.redirect(new URL(`/orders/${(await ctx.params).id}?payment=failed`, siteUrl()))
  const { body } = (await res.json()) as { body: { paymentUrl: string } }
  return NextResponse.redirect(body.paymentUrl)
}
