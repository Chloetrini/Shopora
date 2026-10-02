import type { NextRequest } from 'next/server'
import { listProducts } from '@/server/db/products'
import { ok } from '@/server/http'

/** The public catalogue, for the phone app. The website reads the same data straight from the database. */
export async function GET(_req: NextRequest) {
  return ok('Products', { products: await listProducts() })
}

export const dynamic = 'force-dynamic'
