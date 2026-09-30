import { NextResponse, type NextRequest } from 'next/server'
import { expireStaleOrders } from '@/server/db/orders'
import { retryMissingConfirmations } from '@/server/order-emails'

/**
 * Vercel Cron calls this daily (see vercel.json) and sends `Authorization: Bearer $CRON_SECRET`.
 * Without CRON_SECRET set the route refuses everyone, so nobody else can trigger it.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new NextResponse('Unauthorized', { status: 401 })
  const cancelled = await expireStaleOrders(24)
  // Also try again for any paid order whose confirmation email never went out.
  const retried = await retryMissingConfirmations(25)
  return NextResponse.json({ success: true, cancelled, retriedConfirmations: retried })
}
