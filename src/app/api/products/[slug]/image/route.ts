import { NextResponse, type NextRequest } from 'next/server'
import { getProductImage } from '@/server/db/features'

/** Serves a photo uploaded in the admin. The URL carries ?v=<timestamp>, so it can be cached for a year. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const img = await getProductImage((await params).slug)
  if (!img) return new NextResponse('Not found', { status: 404 })
  return new NextResponse(new Uint8Array(img.bytes), {
    headers: { 'Content-Type': img.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  })
}
