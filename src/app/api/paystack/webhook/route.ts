import { NextResponse, type NextRequest } from 'next/server'
import { finalizePayment } from '@/server/payments'
import { validWebhookSignature } from '@/server/paystack'

/** Backup for a buyer who pays and closes the tab. Set this URL in the Paystack dashboard. */
export async function POST(req: NextRequest) {
  const raw = await req.text() // the signature covers the exact bytes, so read the raw body
  if (!validWebhookSignature(raw, req.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ success: false, message: 'Bad signature' }, { status: 401 })
  }
  try {
    const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } }
    if (event.event === 'charge.success' && event.data?.reference) {
      // Re-verify with Paystack instead of trusting the body.
      await finalizePayment(event.data.reference)
    }
  } catch (e) {
    console.error('Paystack webhook failed', e)
    return NextResponse.json({ success: false }, { status: 500 }) // Paystack retries on non-2xx
  }
  return NextResponse.json({ success: true })
}
