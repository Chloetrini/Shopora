import { NextResponse, type NextRequest } from 'next/server'
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
    const url = await startPayment((await params).id)
    if (!url) return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 })
    return NextResponse.json({ success: true, message: 'Payment started', body: { paymentUrl: url } })
  } catch (e) {
    console.error('startPayment failed', e instanceof PaystackError ? e.message : e)
    return NextResponse.json({ success: false, message: 'Could not start the payment. Try again.' }, { status: 502 })
  }
}
