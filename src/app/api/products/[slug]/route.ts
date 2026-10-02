import type { NextRequest } from 'next/server'
import { fail, ok } from '@/server/http'
import { getProductBySlug } from '@/server/db/products'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const product = await getProductBySlug((await params).slug)
  return product ? ok('Product', { product }) : fail('Not found', 404)
}

export const dynamic = 'force-dynamic'
