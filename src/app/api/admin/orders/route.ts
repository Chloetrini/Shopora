import type { NextRequest } from 'next/server'
import { canTransition, type OrderStatus } from '@/lib/order-status'
import { countUnsentConfirmations, listOrdersForAdmin } from '@/server/db/orders'
import { ok } from '@/server/http'
import { requireAdmin } from '@/server/require-user'

const STATUSES: OrderStatus[] = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']

/** Admin only (anyone else gets a 404). The orders list for the phone app, with the moves each order may make next. */
export async function GET(req: NextRequest) {
  const a = await requireAdmin(req)
  if ('res' in a) return a.res
  const [orders, unsent] = await Promise.all([listOrdersForAdmin(), countUnsentConfirmations()])
  return ok('Orders', { orders: orders.map((o) => ({ ...o, next: STATUSES.filter((s) => canTransition(o.status, s)) })), unsent })
}

export const dynamic = 'force-dynamic'
