import { NextResponse, type NextRequest } from 'next/server'
import { orderSchema } from '@/lib/validation'
import { getRequestUser } from '@/server/current-user'
import { createOrder, OutOfStockError } from '@/server/db/orders'
import { startPayment } from '@/server/payments'
import { paystackConfigured } from '@/server/paystack'
import { allow, clientIp } from '@/server/rate-limit'

export async function POST(req: NextRequest) {
  // Each order takes stock, so cap how fast one address can place them.
  if (!allow(`order:${clientIp(req)}`, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ success: false, message: 'Too many orders. Try again in a few minutes.' }, { status: 429 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: 'Validation failed',
        details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 },
    )
  }
  try {
    // Signed in: the order belongs to the session's user. The id is never read from the request.
    const user = await getRequestUser(req)
    const { id } = await createOrder(parsed.data, user?.id ?? null)
    // If Paystack is down or not configured the order is still saved; the order page offers "Pay now".
    let paymentUrl: string | null = null
    if (paystackConfigured()) {
      try {
        paymentUrl = await startPayment(id)
      } catch (e) {
        console.error('startPayment failed', e)
      }
    }
    return NextResponse.json({ success: true, message: 'Order placed', body: { id, paymentUrl } }, { status: 201 })
  } catch (e) {
    if (e instanceof OutOfStockError) {
      return NextResponse.json({ success: false, message: e.message, code: 'out_of_stock' }, { status: 409 })
    }
    console.error('createOrder failed', e)
    return NextResponse.json({ success: false, message: 'Could not place the order. Try again.' }, { status: 500 })
  }
}
