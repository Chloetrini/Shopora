import { NextResponse, type NextRequest } from 'next/server'
import { orderSchema } from '@/lib/validation'
import { getRequestUser } from '@/server/current-user'
import { adminEmails } from '@/server/admin'
import { saveAddressIfNew } from '@/server/db/features'
import { createOrder, expireStaleOrders, InvalidDiscountError, lowStockAfterOrder, NoDeliveryError, OrderTooLargeError, OutOfStockError } from '@/server/db/orders'
import { lowStockEmail } from '@/server/email-templates'
import { sendEmail } from '@/server/email.service'
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
    // Put back the stock of orders that were never paid (best effort; the daily cron does the same).
    await expireStaleOrders(24).catch((e) => console.error('expireStaleOrders failed', e))
    const { id } = await createOrder(parsed.data, user?.id ?? null)
    if (user && parsed.data.saveAddress) {
      const d = parsed.data
      await saveAddressIfNew(user.id, { fullName: d.fullName, addressLine1: d.addressLine1, addressLine2: d.addressLine2, city: d.city, region: d.region, postalCode: d.postalCode, country: d.country })
        .catch((e) => console.error('saveAddressIfNew failed', e))
    }
    await alertLowStock(id)
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
    if (e instanceof InvalidDiscountError) {
      return NextResponse.json({ success: false, message: e.message, code: 'invalid_discount', details: [{ path: 'discountCode', message: e.message }] }, { status: 409 })
    }
    if (e instanceof NoDeliveryError) {
      return NextResponse.json({ success: false, message: e.message, code: 'no_delivery', details: [{ path: 'country', message: e.message }] }, { status: 409 })
    }
    if (e instanceof OrderTooLargeError) {
      return NextResponse.json({ success: false, message: e.message }, { status: 400 })
    }
    if (e instanceof OutOfStockError) {
      return NextResponse.json({ success: false, message: e.message, code: 'out_of_stock' }, { status: 409 })
    }
    console.error('createOrder failed', e)
    return NextResponse.json({ success: false, message: 'Could not place the order. Try again.' }, { status: 500 })
  }
}

/** Emails the admins when this order pushed a product down to 5 or fewer. Never blocks or fails the order. */
async function alertLowStock(orderId: string): Promise<void> {
  try {
    const admins = adminEmails()
    if (admins.length === 0) return
    const low = await lowStockAfterOrder(orderId, 5)
    if (low.length === 0) return
    const mail = lowStockEmail(low)
    await Promise.all(admins.map((to) => sendEmail({ to, ...mail }).catch((e) => console.error('Low stock email failed', e instanceof Error ? e.message : e))))
  } catch (e) {
    console.error('alertLowStock failed', e)
  }
}
