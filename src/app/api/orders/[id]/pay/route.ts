import { NextResponse, type NextRequest } from 'next/server'
import { startPayment } from '@/server/payments'
import { paystackConfigured, PaystackError } from '@/server/paystack'

/** Start (or restart) payment for a pending order. The order id in the URL is the guest's access key. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
